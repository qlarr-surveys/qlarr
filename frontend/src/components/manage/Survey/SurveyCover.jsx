import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { buildResourceUrl } from "~/networking/common";
import { fDate } from "~/utils/format-time";
import { serverDateTimeToLocalDateTime } from "~/utils/DateUtils";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import styles from "./Survey.module.css";

// The clean brand logo, not /placehoder-logo.png: that one is tiled with a
// "Qlarr" watermark meant for image placeholders, not for a survey's cover.
const DEFAULT_LOGO = "/qlarr.png";

/**
 * The card's cover: the survey logo, the status pill, and — for an admin — a
 * way to replace the logo by clicking, keyboard, or dropping a file on it.
 *
 * The replace affordance is a real `<button>` over a hidden input rather than
 * the old `<Box onClick>` that called `getElementById(...).click()`: that was
 * unreachable by keyboard. CSS reveals it on `:hover`, `:focus-within` and
 * while a file is dragged over.
 */
export function SurveyCover({ survey, surveyStatus, isEditable, onUpload }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const logoUrl = survey.image
    ? buildResourceUrl(survey.image, survey.id)
    : DEFAULT_LOGO;
  // "Add" reuses the existing key; only "Replace" is new copy.
  const uploadLabel = t(
    survey.image ? "edit_survey.replace_logo" : "edit_survey.add_logo"
  );

  const handleFile = (file) => {
    if (file) {
      onUpload(file);
    }
  };

  // Without preventDefault on both enter and over, the browser navigates away
  // to the dropped file.
  const allowDrop = (event) => {
    if (!isEditable) return;
    event.preventDefault();
    setIsDragOver(true);
  };

  return (
    <div
      className={styles.cover}
      data-dragover={isDragOver ? "true" : undefined}
      onDragEnter={allowDrop}
      onDragOver={allowDrop}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        if (!isEditable) return;
        event.preventDefault();
        setIsDragOver(false);
        handleFile(event.dataTransfer.files?.[0]);
      }}
    >
      {/* Decorative: the survey name is right below it. */}
      <div
        aria-hidden="true"
        className={styles.coverLogo}
        style={{ backgroundImage: `url("${logoUrl}")` }}
      />

      {isEditable && (
        <>
          <button
            type="button"
            className={styles.coverReplace}
            onClick={() => inputRef.current?.click()}
            aria-label={uploadLabel}
          >
            <span aria-hidden="true" className={styles.coverReplaceIcon}>
              <Upload size={16} strokeWidth={1.5} />
            </span>
            <span aria-hidden="true" className={styles.coverReplaceLabel}>
              {uploadLabel}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className={styles.coverInput}
            onChange={(event) => {
              const file = event.target.files[0];
              // Clear it so picking the same file again still fires onChange.
              event.target.value = "";
              handleFile(file);
            }}
          />
        </>
      )}

      <CustomTooltip
        showIcon={false}
        placement="top-end"
        body={statusLegend(t, survey)}
        tooltipSx={{ maxWidth: 360 }}
      >
        <div className={`${styles.statusPill} ${styles[surveyStatus]}`}>
          <span className={styles.statusDot} />
          {t(`status.${surveyStatus}`)}
        </div>
      </CustomTooltip>
    </div>
  );
}

/**
 * The five-status legend, plus this survey's own dates when it has them.
 *
 * The card no longer lists start and end dates, so without this a scheduled or
 * expiring survey would lose the only place that said when.
 */
function statusLegend(t, survey) {
  const legend = t("users_manage.statuses_info");
  const dates = [];

  // Whatever dates the survey carries, whatever its status. Gating these on
  // status would hide the dates of a draft that has them, which the old card
  // did show.
  if (survey.startDate) {
    dates.push(
      `${t("edit_survey.metadata.start_date")}: ${fLocal(survey.startDate)}`
    );
  }
  if (survey.endDate) {
    dates.push(
      `${t("edit_survey.metadata.end_date")}: ${fLocal(survey.endDate)}`
    );
  }

  return dates.length ? `${legend}<p>${dates.join(" &middot; ")}</p>` : legend;
}

const fLocal = (serverDate) => fDate(serverDateTimeToLocalDateTime(serverDate));
