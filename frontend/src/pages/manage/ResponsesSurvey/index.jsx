import React, { useCallback, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { Box, Tab, Tabs } from "@mui/material";
import styles from "./ResponsesSurvey.module.css";
import ResponsesList from "./ResponsesList";
import AnalyticsSurvey from "~/pages/manage/AnalyticsSurvey";
import CrosstabsSurvey from "~/pages/manage/CrosstabsSurvey";
import CalculationsSurvey from "~/pages/manage/CalculationsSurvey";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";

function ResponsesSurvey() {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const [activeTab, setActiveTab] = useState("responses");
  const hasVisitedResponses = useRef(activeTab === "responses");
  const hasVisitedAnalytics = useRef(activeTab === "analytics");
  const hasVisitedCrosstabs = useRef(activeTab === "crosstabs");
  const hasVisitedCalculations = useRef(activeTab === "calculations");
  // Unsaved edits in the Calculated fields tab: leaving it asks first.
  const calculationsDirty = useRef(false);
  const [pendingTab, setPendingTab] = useState(null);
  const onCalculationsDirtyChange = useCallback((dirty) => {
    calculationsDirty.current = dirty;
  }, []);

  const handleTabChange = (_, newValue) => {
    if (activeTab === "calculations" && calculationsDirty.current) {
      setPendingTab(newValue);
      return;
    }
    switchTab(newValue);
  };

  const switchTab = (newValue) => {
    setActiveTab(newValue);
    if (newValue === "responses") {
      hasVisitedResponses.current = true;
    }
    if (newValue === "analytics") {
      hasVisitedAnalytics.current = true;
    }
    if (newValue === "crosstabs") {
      hasVisitedCrosstabs.current = true;
    }
    if (newValue === "calculations") {
      hasVisitedCalculations.current = true;
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
        <Tab
          label={t("responses.tab_crosstabs", "Crosstabs")}
          value="crosstabs"
        />
        <Tab
          label={t("responses.tab_calculations", "Calculated fields")}
          value="calculations"
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

      {hasVisitedCrosstabs.current && (
        <Box
          sx={{
            display: activeTab === "crosstabs" ? "block" : "none",
            flex: 1,
            overflow: "auto",
            pt: 2,
          }}
        >
          <CrosstabsSurvey />
        </Box>
      )}

      {hasVisitedCalculations.current && (
        <Box
          sx={{
            display: activeTab === "calculations" ? "block" : "none",
            flex: 1,
            overflow: "auto",
            pt: 2,
          }}
        >
          <CalculationsSurvey onDirtyChange={onCalculationsDirtyChange} />
        </Box>
      )}

      <ConfirmActionModal
        open={pendingTab !== null}
        onClose={() => setPendingTab(null)}
        onConfirm={() => {
          switchTab(pendingTab);
          setPendingTab(null);
        }}
        title={t("calculations.unsaved_title", "Unsaved changes")}
        description={t(
          "calculations.unsaved_description",
          "Your changes to the calculations aren't saved. Leave anyway?"
        )}
        cancelLabel={t("calculations.unsaved_stay", "Stay")}
        confirmLabel={t("calculations.unsaved_leave", "Leave")}
        confirmColor="warning"
      />
    </Box>
  );
}

export default React.memo(ResponsesSurvey);
