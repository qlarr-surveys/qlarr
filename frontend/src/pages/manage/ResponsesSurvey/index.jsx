import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import styles from "./ResponsesSurvey.module.css";
import ResponsesList from "./ResponsesList";
import AnalyticsSurvey from "~/pages/manage/AnalyticsSurvey";
import CrosstabsSurvey from "~/pages/manage/CrosstabsSurvey";
import CalculationsSurvey from "~/pages/manage/CalculationsSurvey";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";

const VIEWS = [
  {
    id: "responses",
    label: "responses.tab_individual",
    fallback: "Individual Responses",
  },
  { id: "analytics", label: "responses.tab_analytics", fallback: "Analytics" },
  { id: "crosstabs", label: "responses.tab_crosstabs", fallback: "Crosstabs" },
  {
    id: "calculations",
    label: "responses.tab_calculations",
    fallback: "Calculated fields",
  },
];

function ResponsesSurvey() {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const [activeTab, setActiveTab] = useState("responses");
  // A view mounts on its first visit and then stays mounted, hidden, so
  // coming back to it keeps its state.
  const visited = useRef(new Set([activeTab]));
  // Unsaved edits in the Calculated fields tab: leaving it asks first.
  const calculationsDirty = useRef(false);
  const [pendingTab, setPendingTab] = useState(null);
  // Bumped when coming back from Calculated fields, where a Compute may have
  // changed the responses' calculated values: the list refetches.
  const [responsesRefreshKey, setResponsesRefreshKey] = useState(0);
  // All of the survey's responses, unfiltered, for the count on the tab.
  const [responsesTotal, setResponsesTotal] = useState(null);
  const tabRefs = useRef({});

  const onCalculationsDirtyChange = useCallback((dirty) => {
    calculationsDirty.current = dirty;
  }, []);

  const switchTab = (newValue) => {
    if (activeTab === "calculations" && newValue === "responses") {
      setResponsesRefreshKey((key) => key + 1);
    }
    visited.current.add(newValue);
    setActiveTab(newValue);
  };

  const handleTabChange = (newValue) => {
    if (newValue === activeTab) return;
    if (activeTab === "calculations" && calculationsDirty.current) {
      setPendingTab(newValue);
      return;
    }
    switchTab(newValue);
  };

  // Arrow keys, Home and End move along the strip, as in any tab list.
  const onStripKeyDown = (e) => {
    const ids = VIEWS.map((view) => view.id);
    const at = ids.indexOf(activeTab);
    const rtl = document.dir === "rtl";
    const step = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
    }[e.key];
    let next = null;
    if (step) next = ids[(at + step + ids.length) % ids.length];
    if (e.key === "Home") next = ids[0];
    if (e.key === "End") next = ids[ids.length - 1];
    if (!next) return;
    e.preventDefault();
    tabRefs.current[next]?.focus();
    handleTabChange(next);
  };

  const panelStyle = (id) => ({ display: activeTab === id ? "flex" : "none" });

  return (
    <div className={styles.workspace}>
      <div className={styles.strip}>
        <div
          role="tablist"
          aria-label={t("responses.title")}
          className={styles.views}
          onKeyDown={onStripKeyDown}
        >
          {VIEWS.map(({ id, label, fallback }) => {
            const selected = id === activeTab;
            return (
              <button
                key={id}
                ref={(el) => (tabRefs.current[id] = el)}
                type="button"
                role="tab"
                id={`responses-view-${id}`}
                aria-controls={`responses-panel-${id}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => handleTabChange(id)}
                className={`${styles.view} ${selected ? styles.viewOn : ""}`}
              >
                {t(label, fallback)}
                {id === "responses" && responsesTotal !== null && (
                  <span className={styles.viewCount}>{responsesTotal}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {VIEWS.filter(({ id }) => visited.current.has(id)).map(({ id }) => (
        <div
          key={id}
          role="tabpanel"
          id={`responses-panel-${id}`}
          aria-labelledby={`responses-view-${id}`}
          className={styles.panel}
          style={panelStyle(id)}
        >
          {id === "responses" ? (
            <ResponsesList
              refreshKey={responsesRefreshKey}
              onTotalChange={setResponsesTotal}
            />
          ) : id === "analytics" ? (
            <AnalyticsSurvey />
          ) : id === "crosstabs" ? (
            <CrosstabsSurvey />
          ) : (
            <div className={styles.pane}>
              {id === "calculations" && (
                <CalculationsSurvey onDirtyChange={onCalculationsDirtyChange} />
              )}
            </div>
          )}
        </div>
      ))}

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
          "Your changes to the calculations aren't saved. Leave anyway?",
        )}
        cancelLabel={t("calculations.unsaved_stay", "Stay")}
        confirmLabel={t("calculations.unsaved_leave", "Leave")}
        confirmColor="warning"
      />
    </div>
  );
}

export default React.memo(ResponsesSurvey);
