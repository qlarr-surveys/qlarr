import { getparam } from "~/networking/run";
import styles from "./PreviewSurvey.module.css";
import { useParams, useSearchParams } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import SurveyIcon from "~/components/common/SurveyIcons/SurveyIcon";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
} from "@mui/material";
import { BG_COLOR } from "~/constants/theme";
import { PREVIEW_MODE, routes } from "~/routes";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import PreviewSurveyTourProvider from "~/components/manage/PreviewSurveyTour";

function PreviewSurvey({ responseId = null }) {
  const [searchParams] = useSearchParams();
  const [previewMode, setPreviewMode] = useState(
    searchParams.get("mode") || "online"
  );
  const [navigationMode, setNavigationMode] = useState(
    searchParams.get("navigation_mode") || "ALL_IN_ONE"
  );
  const [currentResponseId, setCurrentResponseId] = useState(responseId);
  const { t } = useTranslation(NAMESPACES.MANAGE);

  const surveyId = getparam(useParams(), "surveyId");

  const notifyIframe = (previewMode, navigationMode) => {
    const iframe = document.getElementById("myIframe");
    iframe.contentWindow.postMessage(
      {
        type: "PREVIEW_MODE_CHANGED",
        mode: previewMode == "offline" ? "offline" : "online",
        navigationMode: navigationMode,
      },
      window.location.origin
    );
  };

  const embeddedParams = useMemo(
    () =>
      (responseId
        ? routes.resumeIframePreviewSurvey
            .replace(":surveyId", surveyId)
            .replace(":responseId", responseId)
        : routes.iframePreviewSurvey.replace(":surveyId", surveyId)) +
          "?mode=" + previewMode +
          (navigationMode ? "&navigation_mode=" + navigationMode : ""),
    []
  );

  const handleChange = (event, newValue) => {
    notifyIframe(newValue, navigationMode);
    setPreviewMode(newValue);
    formatUrl(newValue, navigationMode);
  };

  const handleNavigationModeChange = (event) => {
    notifyIframe(previewMode, event.target.value);
    setNavigationMode(event.target.value);
    formatUrl(previewMode, event.target.value);
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === "RESPONSE_ID_RECEIVED") {
        const iFrameResponseId = event.data.responseId;
        if (currentResponseId != iFrameResponseId) {
          setCurrentResponseId(iFrameResponseId);
          window.history.replaceState(
            {},
            "",
            routes.resumePreview
              .replace(":surveyId", surveyId)
              .replace(":responseId", iFrameResponseId)
          );
        }
        return;
      }

      if (event.data.type === "PREVIEW_END_ACTION") {
        const responseIdFromMsg =
          event.data.responseId || currentResponseId;

        if (event.data.action === "check") {
          // sessionStorage doesn't cross tabs, so pass responseId via URL.
          const baseUrl = routes.responses.replace(":surveyId", surveyId);
          const targetUrl = responseIdFromMsg
            ? `${baseUrl}?responseId=${encodeURIComponent(responseIdFromMsg)}`
            : baseUrl;
          window.open(targetUrl, "_blank", "noopener,noreferrer");
          return;
        }

        if (event.data.action === "reset") {
          window.location.href =
            routes.preview.replace(":surveyId", surveyId) +
            window.location.search;
          return;
        }

        if (event.data.action === "close") {
          // window.close() is silently blocked unless the tab was opened by JS.
          window.close();
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const formatUrl = (previewMode, navigationMode) => {
    window.history.replaceState(
      {},
      "",
      routes.resumePreview
        .replace(":surveyId", surveyId)
        .replace(":responseId", currentResponseId) +
        "?mode=" +
        previewMode +
        (navigationMode ? "&navigation_mode=" + navigationMode : ""),
    );
  };

  return (
    <PreviewSurveyTourProvider>
      <Box
        display="flex"
        position="relative"
        width="100%"
        justifyContent="center"
        alignItems="center"
      >
        <Tabs
          data-tour="preview-mode-tabs"
          value={previewMode}
          onChange={handleChange}
          aria-label={t("aria.preview_mode_tabs")}
        >
          <Tab value={PREVIEW_MODE.ONLINE} label={<SurveyIcon name="pc" />} />
          <Tab
            value={PREVIEW_MODE.ONLINE_PHONE}
            label={<SurveyIcon name="phone" />}
          />
          <Tab
            value={PREVIEW_MODE.OFFLINE}
            label={<SurveyIcon name="offline" />}
          />
        </Tabs>

        <Box data-tour="navigation-mode-select" position="absolute" right="16px" top="0px">
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="navigation-mode-select-label">
              {t("preview_page.navigation_mode")}
            </InputLabel>
            <Select
              labelId="navigation-mode-select-label"
              id="navigation-mode-select"
              size="small"
              value={navigationMode}
              onChange={handleNavigationModeChange}
              label={t("preview_page.navigation_mode")}
            >
              <MenuItem value="ALL_IN_ONE">{t("preview_page.all_in_one")}</MenuItem>
              <MenuItem value="GROUP_BY_GROUP">
                {t("preview_page.group_by_group")}
              </MenuItem>
              <MenuItem value="QUESTION_BY_QUESTION">
                {t("preview_page.question_by_question")}
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <div
        className={styles.container}
        style={{
          backgroundColor: BG_COLOR,
        }}
      >
        <div
          className={previewMode === "online" ? "" : styles.wrapperMob}
          style={
            previewMode === "online" ? { height: "calc(100vh - 48px)" } : {}
          }
        >
          {previewMode !== "online" && (
            <img src="/phone-android.png" className={styles.phoneBg} />
          )}
          <iframe
            id="myIframe"
            src={embeddedParams}
            className={
              previewMode === "online"
                ? styles.onlinePreview
                : styles.offlinePreview
            }
            style={
              previewMode === "online" ? { width: "100%", height: "100%" } : {}
            }
          />
        </div>
      </div>
    </PreviewSurveyTourProvider>
  );
}

export default React.memo(PreviewSurvey);
