import React from "react";
import { useSelector } from "react-redux";
import NewComponentsPanel from "~/components/design/NewComponentsPanel";
import ThemePanel from "~/components/design/ThemePanel";
import TranslationPanel from "~/components/design/TranslationPanel";
import { DESIGN_SURVEY_MODE } from "@qlarr/design-core/constants/designMode";
import { isGroup, isQuestion } from "@qlarr/design-core";
import SetupPanel from "../setup/SetupPanel";
import { useDesignReadOnly } from "~/components/design/DesignReadOnly";
import styles from "./LeftPanel.module.css";

/**
 * The editor's left panel: the theme settings in the Theme workspace, the
 * survey's languages in the Translation workspace, and otherwise the settings
 * of whatever is selected, or the question-type list when nothing is.
 */
function LeftPanel({ t }) {
  const designMode = useSelector(
    (state) => state.designState?.designMode || DESIGN_SURVEY_MODE.DESIGN
  );

  const setupCode = useSelector((state) => state.designState?.setup?.code);

  const isBuilder = designMode === DESIGN_SURVEY_MODE.DESIGN;
  const isTheme = designMode === DESIGN_SURVEY_MODE.THEME;
  const isLanguages = designMode === DESIGN_SURVEY_MODE.LANGUAGES;
  const hasSetup = Boolean(setupCode);
  // A read-only preview can't add components; it shows only the settings.
  const readOnly = useDesignReadOnly();

  const ariaLabel = () => {
    if (isTheme) {
      return t("survey_theme");
    }
    if (isLanguages) {
      return t("survey_languages");
    }
    if (!isBuilder) {
      return t("workspace_tools");
    }
    if (!hasSetup) {
      return t("question_types");
    }
    if (isQuestion(setupCode)) {
      return t("question_settings");
    }
    if (isGroup(setupCode)) {
      return t("page_settings");
    }
    return t("workspace_tools");
  };

  if (readOnly && !hasSetup) return null;

  const body = () => {
    if (isTheme) {
      return <ThemePanel t={t} />;
    }
    if (isLanguages) {
      return <TranslationPanel t={t} />;
    }
    if (hasSetup) {
      return <SetupPanel t={t} />;
    }
    return isBuilder && <NewComponentsPanel t={t} />;
  };

  return (
    <aside
      data-tour="left-panel"
      aria-label={ariaLabel()}
      className={styles.aside}
    >
      <div className={styles.body}>{body()}</div>
    </aside>
  );
}

export default React.memo(LeftPanel);
