import React from "react";
import { useSelector } from "react-redux";
import NewComponentsPanel from "~/components/design/NewComponentsPanel";
import { DESIGN_SURVEY_MODE } from "@qlarr/design-core/constants/designMode";
import { isGroup, isQuestion } from "@qlarr/design-core";
import SetupPanel from "../setup/SetupPanel";
import { useDesignReadOnly } from "~/components/design/DesignReadOnly";
import styles from "./LeftPanel.module.css";

/**
 * The editor's left panel: the settings of whatever is selected, or the
 * question-type list when nothing is. The theme and translation workspaces seed
 * `setup` with their own single rule, so there they always show settings.
 */
function LeftPanel({ t }) {
  const designMode = useSelector(
    (state) => state.designState?.designMode || DESIGN_SURVEY_MODE.DESIGN
  );

  const setupCode = useSelector((state) => state.designState?.setup?.code);

  const isBuilder = designMode === DESIGN_SURVEY_MODE.DESIGN;
  const hasSetup = Boolean(setupCode);
  // A read-only preview can't add components; it shows only the settings.
  const readOnly = useDesignReadOnly();

  const ariaLabel = () => {
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

  return (
    <aside
      data-tour="left-panel"
      aria-label={ariaLabel()}
      className={styles.aside}
    >
      <div className={styles.body}>
        {hasSetup ? <SetupPanel t={t} /> : isBuilder && <NewComponentsPanel t={t} />}
      </div>
    </aside>
  );
}

export default React.memo(LeftPanel);
