import React, { useState, useRef, useEffect } from "react";
import { Box, Button, Typography, Select, MenuItem, FormControl, Dialog, IconButton, DialogContent, DialogTitle } from "@mui/material";
import styles from "./Launch.module.css";
import SurveyIcon from "~/components/common/SurveyIcons/SurveyIcon";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { newVersionReceived, setSaving } from "~/state/design/designState";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useService } from "~/hooks/use-service";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { SURVEY_MODE } from "~/constants/survey";
import { surveyAttributeChanged } from "~/state/edit/editState";
import { SurveyActiveFromTo } from "~/components/manage/SurveyActiveFromTo";
import { isSurveyAdmin } from "~/constants/roles";
import { SURVEY_STATUS } from "~/constants/survey";
import { localDateToServerDateTime } from "~/utils/DateUtils";
import SuccessSnackbar from "~/components/manage/SuccessSnackbar";
import { sharingUrl } from "~/networking/common";
import QRCode from "react-qr-code";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@emotion/react";

function LaunchPage({ onPublish }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const designService = useService("design");
  const theme = useTheme();
  const dispatch = useDispatch();
  const qrRef = useRef();

  const versionDto = useSelector((state) => {
    return state.designState.versionDto;
  });
  const published = versionDto?.published;
  const survey = useSelector((state) => state.editState.survey);
  const [surveyMode, setSurveyMode] = useState("");
  const [surveyDateError, setSurveyDateError] = useState("");
  const [isQRDialogOpen, setQRDialogOpen] = useState(false);
  const [copy, setCopy] = useState(false);

  const hasFatalErrors = useSelector((state) => {
    return (
      state.designState.Survey?.errors &&
      state.designState.Survey.errors.length > 0
    );
  });

  const params = new URLSearchParams([
    ["version", versionDto?.version],
    ["sub_version", versionDto?.subVersion],
  ]);

  const publish = () => {
    dispatch(setSaving(true));
    designService
      .publish(params)
      .then((data) => {
        dispatch(setSaving(false));
        dispatch(newVersionReceived(data));
        onPublish();
      })
      .catch((error) => {
        dispatch(setSaving(false));
      });
  };

  useEffect(() => {
    const newSurveyMode = survey?.usage || "";
    setSurveyMode(newSurveyMode);
  }, [survey]);

  const isDisabled = !isSurveyAdmin() || survey?.status == SURVEY_STATUS.CLOSED;

  const getUserTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const onSurveyActiveFromChanged = (value) => {
    setSurveyDateError("");
    const dateValue = value instanceof Date ? value : value.toDate();
    dispatch(
      surveyAttributeChanged({
        key: "startDate",
        value: dateValue ? localDateToServerDateTime(dateValue) : null,
      })
    );
  };

  const onSurveyActiveToChanged = (value) => {
    setSurveyDateError("");
    const dateValue = value instanceof Date ? value : value.toDate();
    dispatch(
      surveyAttributeChanged({
        key: "endDate",
        value: dateValue ? localDateToServerDateTime(dateValue) : null,
      })
    );
  };

  const onSurveyModeChanged = (e) => {
    setSurveyMode(e.target.value);
    dispatch(
      surveyAttributeChanged({
        key: "usage",
        value: e.target.value,
      })
    );
  };

  const clickCopy = () => {
    navigator.clipboard.writeText(sharingUrl(survey?.id));
    setCopy(true);
  };

  const toggleQRDialog = () => {
    setQRDialogOpen(!isQRDialogOpen);
  };

  const downloadQRCode = () => {
    const canvas = document.createElement("canvas");
    const qrCodeSVG = qrRef.current.querySelector("svg");
    const svgData = new XMLSerializer().serializeToString(qrCodeSVG);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(blobURL);
      const canvasDataURL = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = canvasDataURL;
      a.download = `${survey?.name}_QRCode.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    image.src = blobURL;
  };

  const mailSurveyLink = `mailto:?subject=Survey Link&body=Please complete this survey: ${encodeURIComponent(
    sharingUrl(survey?.id)
  )}`;

  return (
    <Box className={styles.box}>
      {!published && (
        <Box
          display="flex"
          alignItems="center"
          className={styles.publishContainer}
          sx={{
            backgroundColor: theme.palette.warning.lighter,
            padding: '1rem',
            borderRadius: '8px',
            border: `1px solid ${theme.palette.warning.light}`
          }}
        >
          <Typography variant="subtitle1" sx={{ color: theme.palette.warning.dark }}>
            {versionDto?.status === "draft" 
              ? t("launch.draft_text")
              : t("launch.unpublished_text")}
          </Typography>

          <>
            <CustomTooltip
              showIcon={false}
              title={
                !hasFatalErrors
                  ? `${t("launch.publish_tooltip")}`
                  : `${t("launch.publish_error")}`
              }
              placement="top"
            >
              <span>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  className={styles.actionButton}
                  onClick={() => {
                    if (!hasFatalErrors) {
                      publish();
                    }
                  }}
                  disabled={hasFatalErrors}
                >
                  <SurveyIcon
                    name="launch"
                    color={!hasFatalErrors ? "#fff" : "#bdbdbd"}
                  />
                  {versionDto?.status === "draft" 
                    ? t("launch.activate")
                    : t("launch.publish")}
                </Button>
              </span>
            </CustomTooltip>
          </>
        </Box>
      )}

      {/* EditSurveyGeneral inlined */}
      <Box sx={{ mb: 4, mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <CustomTooltip title={t("tooltips.survey_mode")} />
          <Typography variant="subtitle1" sx={{ ml: 1 }}>
            {t("label.survey_mode")}
          </Typography>
        </Box>
        <FormControl fullWidth>
          <Select
            value={surveyMode}
            onChange={onSurveyModeChanged}
            displayEmpty
            sx={{
              borderRadius: "12px",
              "& .MuiOutlinedInput-notchedOutline": {
                border: "1px solid #d7d7d7",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                border: "1px solid #181735",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#181735",
              },
              "& .MuiOutlinedInput-input": {
                padding: ".5rem",
              },
              "& .MuiSelect-select": {
                padding: "12px 14px",
              },
            }}
          >
            {[
              { value: SURVEY_MODE.WEB, label: `mode.${SURVEY_MODE.WEB}` },
              { value: SURVEY_MODE.OFFLINE, label: `mode.${SURVEY_MODE.OFFLINE}` },
              { value: SURVEY_MODE.MIXED, label: `mode.${SURVEY_MODE.MIXED}` },
            ].map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.label)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CustomTooltip title={t("tooltips.survey_dates")} />
            <Typography variant="subtitle1" sx={{ ml: 1 }}>
              {t("label.survey_dates")}
            </Typography>
          </Box>
          <SurveyActiveFromTo
            error={surveyDateError}
            disabled={isDisabled}
            surveyActiveFrom={survey?.startDate}
            surveyActiveTo={survey?.endDate}
            onSurveyActiveFromChanged={onSurveyActiveFromChanged}
            onSurveyActiveToChanged={onSurveyActiveToChanged}
          />
          <Typography
            variant="caption"
            color="error"
            display="flex"
            alignItems="center"
            sx={{ mt: 1 }}
          >
            {t("timezone_info")}
          </Typography>
        </Box>
      </Box>

      {/* SurveySharing inlined */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <CustomTooltip title={t("tooltips.survey_url")} />
          <Typography variant="subtitle1" sx={{ ml: 1 }}>
            {t("label.survey_url")}
          </Typography>
        </Box>
        {copy && (
          <SuccessSnackbar
            handleClose={() => setCopy(false)}
            success="copied"
            left="56"
          />
        )}
        <Box sx={{ mb: 2 }}>
          <a href={sharingUrl(survey?.id)} style={{ color: theme.palette.primary.main }}>
            {sharingUrl(survey?.id).slice(0, 50)}...{sharingUrl(survey?.id).slice(-10)}
          </a>
        </Box>
        <Box display="flex" gap={2} sx={{ mb: 2 }}>
          <Button
            fullWidth
            onClick={toggleQRDialog}
            className={styles.actionButton}
          >
            <SurveyIcon name="qrCode" />
            {t("launch.qr_code")}
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            className={styles.copyButton}
            onClick={clickCopy}
          >
            <SurveyIcon name="duplicate" color="#fff" />
            {t("launch.copy_link")}
          </Button>
        </Box>
      </Box>

      <Dialog
        open={isQRDialogOpen}
        onClose={toggleQRDialog}
        sx={{ "& .MuiDialog-paper": { padding: "2rem", position: "relative" } }}
      >
        <DialogTitle sx={{ m: 0, p: 2 }}>
          <IconButton
            aria-label="close"
            onClick={toggleQRDialog}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <div ref={qrRef}>
            <QRCode value={sharingUrl(survey?.id)} size={256} />
          </div>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={downloadQRCode}
            sx={{ mt: 2 }}
          >
            {t("launch.download_qr_code")}
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default LaunchPage;
