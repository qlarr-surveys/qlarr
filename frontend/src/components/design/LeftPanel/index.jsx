import React from "react";
import { useSelector } from "react-redux";
import NewComponentsPanel from "~/components/design/NewComponentsPanel";
import { DESIGN_SURVEY_MODE } from "@qlarr/design-core/constants/designMode";
import { isGroup, isQuestion } from "@qlarr/design-core";
import SetupPanel from "../setup/SetupPanel";
import styles from "./LeftPanel.module.css";

const TYPES = "types";
const SETTINGS = "settings";

/**
 * The editor's left panel: the question-type list and the settings of whatever
 * is selected, as two tabs over one scrolling body.
 *
 * The tabs are the point. Selecting a question used to *replace* the type list
 * with its settings, with no way back but deselecting, so adding two questions
 * in a row meant clicking into empty canvas between them. Here the tab switches
 * the view and leaves `designState.setup` alone, so the selection survives and
 * the settings are one click away again.
 *
 * In the theme and translation workspaces there is no type list to offer —
 * those modes seed `setup` with their own single rule — so the tablist gives
 * way to a plain title.
 */
function LeftPanel({ t }) {
  const designMode = useSelector(
    (state) => state.designState?.designMode || DESIGN_SURVEY_MODE.DESIGN
  );

  const setupCode = useSelector((state) => state.designState?.setup?.code);

  const order = useSelector((state) =>
    setupCode ? state.designState.index?.[setupCode] : undefined
  );

  const isBuilder = designMode === DESIGN_SURVEY_MODE.DESIGN;
  const hasSetup = Boolean(setupCode);

  const [tab, setTab] = React.useState(TYPES);

  // A selection arriving is a request to see its settings; losing one — picking
  // a workspace, closing the panel, clearing the canvas — returns to the list.
  React.useEffect(() => {
    setTab(setupCode ? SETTINGS : TYPES);
  }, [setupCode]);

  const showTypes = isBuilder && tab === TYPES;
  const showSettings = hasSetup && tab === SETTINGS;

  const settingsLabel = () => {
    if (setupCode && isQuestion(setupCode) && order) {
      return t("settings_for", { order });
    }
    if (setupCode && isGroup(setupCode)) {
      return t("page_settings");
    }
    return t("settings");
  };

  const ariaLabel = () => {
    if (!isBuilder) {
      return t("workspace_tools");
    }
    if (tab === TYPES) {
      return t("question_types");
    }
    if (setupCode && isQuestion(setupCode)) {
      return t("question_settings");
    }
    if (setupCode && isGroup(setupCode)) {
      return t("page_settings");
    }
    return t("workspace_tools");
  };

  const workspaceTitle =
    designMode === DESIGN_SURVEY_MODE.THEME
      ? t("survey_theme")
      : t("survey_languages");

  return (
    <aside
      data-tour="left-panel"
      aria-label={ariaLabel()}
      className={styles.aside}
    >
      {isBuilder ? (
        <div role="tablist" aria-label={t("left_panel")} className={styles.tablist}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === TYPES}
            onClick={() => setTab(TYPES)}
            className={[
              styles.tab,
              tab === TYPES && (hasSetup ? styles.tabActive : styles.tabActiveAlone),
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {t("question_types")}
          </button>
          {/* Absent, not disabled: with nothing selected there are no settings
              to name, and a tab labelled for a selection that does not exist
              is harder to read than one tab on its own. */}
          {hasSetup && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === SETTINGS}
              onClick={() => setTab(SETTINGS)}
              className={[styles.tab, tab === SETTINGS && styles.tabActive]
                .filter(Boolean)
                .join(" ")}
            >
              {settingsLabel()}
            </button>
          )}
        </div>
      ) : (
        <div className={styles.title}>{workspaceTitle}</div>
      )}

      <div className={styles.body}>
        {showTypes && <NewComponentsPanel t={t} />}
        {showSettings && <SetupPanel t={t} />}
      </div>
    </aside>
  );
}

export default React.memo(LeftPanel);
