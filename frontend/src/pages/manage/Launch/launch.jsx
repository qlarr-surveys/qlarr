import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Copy, Download, LayoutGrid, Send } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { brokenQuotaCodes } from "@qlarr/design-core";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useService } from "~/hooks/use-service";
import { useDesignRestore } from "~/hooks/useDesignRestore";
import { newVersionReceived, setSaving } from "~/state/design/designState";
import { surveyAttributeChanged } from "~/state/edit/editState";
import { SURVEY_MODE, SURVEY_STATUS } from "~/constants/survey";
import { isSurveyAdmin } from "~/constants/roles";
import { localDateToServerDateTime } from "~/utils/DateUtils";
import { sharingUrl } from "~/networking/common";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";
import DiscardChangesModal from "~/components/manage/DiscardChangesModal";
import { SurveyActiveFromTo } from "~/components/manage/SurveyActiveFromTo";
import {
  FieldHead,
  fieldStyles as fields,
  Select,
  SettingRow,
} from "~/components/manage/SettingsFields";
import styles from "./Launch.module.css";

const SURVEY_MODES = [SURVEY_MODE.WEB, SURVEY_MODE.OFFLINE, SURVEY_MODE.MIXED];

// How long "Link copied" stands in for "Copy Link".
const COPIED_FOR_MS = 2000;
// The downloaded QR code is drawn larger than the one on screen, on a white
// margin, so it still scans once printed.
const QR_ON_SCREEN = 132;
const QR_DOWNLOAD = 512;
const QR_DOWNLOAD_MARGIN = 32;

const toServerDate = (value) => {
  const date = !value || value instanceof Date ? value : value.toDate();
  return date ? localDateToServerDateTime(date) : null;
};

/**
 * The Launch card's rows: publishing what has changed, where the survey runs,
 * when it is open, and the link respondents use to reach it.
 */
function LaunchPage({ onPublish }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const designService = useService("design");
  const dispatch = useDispatch();
  const qrRef = useRef(null);
  const copiedTimer = useRef(null);
  const modeId = useId();
  const qrPanelId = useId();

  const versionDto = useSelector((state) => state.designState.versionDto);
  const published = versionDto?.published;
  const isDraft = versionDto?.status === "draft";
  const survey = useSelector((state) => state.editState.survey);
  const designState = useSelector((state) => state.designState);
  const hasFatalErrors = useSelector(
    (state) => state.designState.Survey?.errors?.length > 0
  );

  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDiscardOpen, setDiscardOpen] = useState(false);
  const [confirmBrokenQuotas, setConfirmBrokenQuotas] = useState(false);
  const { busy, restoring: discarding, canDiscard, discard } =
    useDesignRestore();

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const brokenQuotaLabels = useMemo(() => {
    const broken = brokenQuotaCodes(designState);
    return (designState.Survey?.quotas || [])
      .filter((quota) => broken.has(quota.code))
      .map((quota) => quota.label || quota.code);
  }, [designState]);

  const isDisabled = !isSurveyAdmin() || survey?.status == SURVEY_STATUS.CLOSED;
  const url = sharingUrl(survey?.id);
  // Long enough to recognise, short enough to stay on one line.
  const shortUrl =
    url.length > 64 ? `${url.slice(0, 50)}…${url.slice(-10)}` : url;

  const publish = () => {
    const params = new URLSearchParams([
      ["version", versionDto?.version],
      ["sub_version", versionDto?.subVersion],
    ]);
    dispatch(setSaving(true));
    designService
      .publish(params)
      .then((data) => {
        dispatch(setSaving(false));
        dispatch(newVersionReceived(data));
        onPublish();
      })
      .catch(() => {
        dispatch(setSaving(false));
      });
  };

  const onPublishClick = () => {
    if (hasFatalErrors) return;
    if (brokenQuotaLabels.length > 0) {
      setConfirmBrokenQuotas(true);
    } else {
      publish();
    }
  };

  const discardChanges = () => discard().finally(() => setDiscardOpen(false));

  const changeSurvey = (key) => (value) =>
    dispatch(surveyAttributeChanged({ key, value }));

  const copyLink = () => {
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), COPIED_FOR_MS);
      },
      () => {}
    );
  };

  const downloadQRCode = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const blobUrl = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml;charset=utf-8",
      })
    );
    const image = new Image();
    image.onload = () => {
      const side = QR_DOWNLOAD + QR_DOWNLOAD_MARGIN * 2;
      const canvas = document.createElement("canvas");
      canvas.width = side;
      canvas.height = side;
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, side, side);
      context.drawImage(
        image,
        QR_DOWNLOAD_MARGIN,
        QR_DOWNLOAD_MARGIN,
        QR_DOWNLOAD,
        QR_DOWNLOAD
      );
      URL.revokeObjectURL(blobUrl);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${survey?.name}_QRCode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    image.src = blobUrl;
  };

  return (
    <>
      {published === false && (
        <SettingRow>
          <div role="status" className={styles.banner}>
            <span className={styles.bannerText}>
              {isDraft ? t("launch.draft_text") : t("launch.unpublished_text")}
            </span>
            <div className={styles.bannerActions}>
              <CustomTooltip
                showIcon={false}
                title={
                  hasFatalErrors
                    ? t("launch.publish_error")
                    : t("launch.publish_tooltip")
                }
                placement="top"
              >
                {/* A disabled button fires no events, so the tooltip that
                    says why it is disabled hangs off this wrapper. */}
                <span className={styles.publishWrap}>
                  <button
                    type="button"
                    disabled={hasFatalErrors}
                    onClick={onPublishClick}
                    className={fields.primaryButton}
                  >
                    <Send aria-hidden="true" size={14} strokeWidth={2} />
                    {isDraft ? t("launch.activate") : t("launch.publish")}
                  </button>
                </span>
              </CustomTooltip>
              {canDiscard && (
                <button
                  type="button"
                  disabled={busy || discarding}
                  onClick={() => setDiscardOpen(true)}
                  className={fields.secondaryButton}
                >
                  {t("launch.discard_changes")}
                </button>
              )}
            </div>
          </div>
        </SettingRow>
      )}

      <SettingRow>
        <FieldHead
          label={t("label.survey_mode")}
          help={t("tooltips.survey_mode")}
          htmlFor={modeId}
        />
        <Select
          id={modeId}
          value={survey?.usage || ""}
          onChange={(event) => changeSurvey("usage")(event.target.value)}
        >
          {!survey?.usage && <option value="" disabled hidden />}
          {SURVEY_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`mode.${mode}`)}
            </option>
          ))}
        </Select>
      </SettingRow>

      <SettingRow>
        <FieldHead
          label={t("label.survey_dates")}
          help={t("tooltips.survey_dates")}
        />
        <SurveyActiveFromTo
          disabled={isDisabled}
          surveyActiveFrom={survey?.startDate}
          surveyActiveTo={survey?.endDate}
          onSurveyActiveFromChanged={(value) =>
            changeSurvey("startDate")(toServerDate(value))
          }
          onSurveyActiveToChanged={(value) =>
            changeSurvey("endDate")(toServerDate(value))
          }
        />
      </SettingRow>

      <SettingRow>
        <FieldHead
          label={t("label.survey_url")}
          help={t("tooltips.survey_url")}
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          {shortUrl}
        </a>
        <div className={styles.shareActions}>
          <button
            type="button"
            aria-expanded={qrOpen}
            aria-controls={qrPanelId}
            onClick={() => setQrOpen((open) => !open)}
            className={`${fields.secondaryButton} ${styles.qrButton}`}
          >
            <LayoutGrid aria-hidden="true" size={14} strokeWidth={2} />
            {t("launch.qr_code")}
          </button>
          <button
            type="button"
            onClick={copyLink}
            className={`${fields.primaryButton} ${styles.copyButton}`}
          >
            <Copy aria-hidden="true" size={14} strokeWidth={2} />
            {copied ? t("launch.link_copied") : t("launch.copy_link")}
          </button>
        </div>
        {/* The button's own label changes too, but a screen reader does not
            announce that. */}
        <span role="status" className={fields.visuallyHidden}>
          {copied ? t("launch.link_copied") : ""}
        </span>
        {qrOpen && (
          <div id={qrPanelId} className={styles.qrPanel}>
            <div ref={qrRef} role="img" aria-label={t("launch.qr_label")}>
              <QRCode value={url} size={QR_ON_SCREEN} fgColor="#0e1338" />
            </div>
            <button
              type="button"
              onClick={downloadQRCode}
              className={fields.secondaryButton}
            >
              <Download aria-hidden="true" size={14} strokeWidth={2} />
              {t("launch.download_qr_code")}
            </button>
          </div>
        )}
      </SettingRow>

      <DiscardChangesModal
        open={isDiscardOpen}
        isLoading={discarding}
        onClose={() => setDiscardOpen(false)}
        onConfirm={discardChanges}
      />
      <ConfirmActionModal
        open={confirmBrokenQuotas}
        title={t("launch.broken_quotas_title")}
        description={t("launch.broken_quotas", {
          quotas: brokenQuotaLabels.join(", "),
        })}
        cancelLabel={t("action_btn.cancel")}
        confirmLabel={t("launch.publish_anyway")}
        confirmColor="warning"
        onClose={() => setConfirmBrokenQuotas(false)}
        onConfirm={() => {
          setConfirmBrokenQuotas(false);
          publish();
        }}
      />
    </>
  );
}

export default LaunchPage;
