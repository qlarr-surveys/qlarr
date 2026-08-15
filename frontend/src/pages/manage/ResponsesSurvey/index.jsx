import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { Box, Tab, Tabs } from "@mui/material";
import styles from "./ResponsesSurvey.module.css";
import ResponsesList from "./ResponsesList";
import AnalyticsSurvey from "~/pages/manage/AnalyticsSurvey";

function ResponsesSurvey() {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const [activeTab, setActiveTab] = useState("responses");
  const hasVisitedResponses = useRef(activeTab === "responses");
  const hasVisitedAnalytics = useRef(activeTab === "analytics");

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
    if (newValue === "responses") {
      hasVisitedResponses.current = true;
    }
    if (newValue === "analytics") {
      hasVisitedAnalytics.current = true;
    }
  };

  return (
    <Box className={styles.mainContainer}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
      >
        <Tab
          label={t("responses.tab_individual", "Individual Responses")}
          value="responses"
        />
        <Tab
          label={t("responses.tab_analytics", "Analytics")}
          value="analytics"
        />
      </Tabs>

      {hasVisitedResponses.current && (
        <Box
          sx={{
            display: activeTab === "responses" ? "flex" : "none",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
            pt: 2,
          }}
        >
          <ResponsesList />
        </Box>
      )}

      {hasVisitedAnalytics.current && (
        <Box
          sx={{
            display: activeTab === "analytics" ? "block" : "none",
            flex: 1,
            overflow: "auto",
            pt: 2,
          }}
        >
          <AnalyticsSurvey />
        </Box>
      )}
    </Box>
  );
}

export default React.memo(ResponsesSurvey);
