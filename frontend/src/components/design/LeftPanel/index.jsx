import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import NewComponentsPanel from "~/components/design/NewComponentsPanel";
import ThemePanel from "~/components/design/ThemePanel";
import TranslationPanel from "~/components/design/TranslationPanel";
import { DESIGN_SURVEY_MODE } from "@qlarr/design-core/constants/designMode";
import { isGroup, isQuestion } from "@qlarr/design-core";
import SetupPanel from "../setup/SetupPanel";
import { useDesignReadOnly } from "~/components/design/DesignReadOnly";
import { resetSetup } from "~/state/design/designState";
import { rtlLanguage } from "~/utils/common";
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

  const showSettingsBar = hasSetup && !isTheme && !isLanguages;

  return (
    <aside
      data-tour="left-panel"
      aria-label={ariaLabel()}
      className={styles.aside}
    >
      {showSettingsBar && (
        <SettingsBar code={setupCode} canGoBack={!readOnly} t={t} />
      )}
      <div className={styles.body}>{body()}</div>
    </aside>
  );
}

export default React.memo(LeftPanel);

/**
 * The settings' title bar, outside the scrolling body: "Q1 settings", and the
 * way back to the question types, which closes the settings.
 */
function SettingsBar({ code, canGoBack, t }) {
  const dispatch = useDispatch();
  const { i18n } = useTranslation();
  const displayCode = useSelector((state) => state.designState?.index?.[code]);
  const isRtl = rtlLanguage.includes(i18n.language);

  let title = t("settings");
  if (isQuestion(code)) {
    title = t("setup_title", { code: displayCode || code });
  } else if (isGroup(code)) {
    title = t("page_settings");
  } else if (code === "Survey") {
    title = t("survey_settings");
  }

  return (
    <div className={styles.bar}>
      {canGoBack && (
        <button
          type="button"
          className={styles.back}
          aria-label={t("back_to_question_types")}
          title={t("back_to_question_types")}
          onClick={() => dispatch(resetSetup())}
          data-preview-allow
        >
          <ArrowLeft
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className={isRtl ? styles.flip : undefined}
          />
        </button>
      )}
      <h2 className={styles.barTitle}>{title}</h2>
    </div>
  );
}
