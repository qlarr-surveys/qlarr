import React, { useId } from "react";
import { useDispatch } from "react-redux";
import { changeValidationValue } from "~/state/design/designState";
import ValidationSetupValue from "~/components/design/setup/validation/ValidationSetupValue";
import ValidationSetupMessage from "~/components/design/setup/validation/ValidationSetupMessage";
import {
  SetupCard,
  SetupHelp,
  SetupRemoveButton,
  SetupToggle,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";
import styles from "./ValidationRulesPanel.module.css";

/**
 * A single preset validation rule.
 * - `pinned` rules (e.g. Required) always show, as a switch.
 * - non-pinned rules only appear once active, as a card whose remove action
 *   drops them back into the "Add rule" pool.
 */
function PresetRuleCard({ code, rule, validationRule, pinned, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const titleId = useId();
  const isActive = validationRule?.isActive || false;
  const title = t(rule + "_title");

  const setActive = (value) =>
    dispatch(changeValidationValue({ code, rule, key: "isActive", value }));

  const body = isActive && (
    <div className={setupFieldStyles.stack}>
      <ValidationSetupValue
        code={code}
        validation={validationRule}
        rule={rule}
        t={t}
      />
      <ValidationSetupMessage
        code={code}
        validationRule={validationRule}
        rule={rule}
        t={t}
      />
    </div>
  );

  if (pinned) {
    return (
      <SetupToggle
        label={title}
        help={help(rule)}
        checked={isActive}
        onChange={setActive}
      >
        {body}
      </SetupToggle>
    );
  }

  return (
    <SetupCard
      aria-labelledby={titleId}
      title={
        <span className={styles.cardTitle}>
          <SetupHelp label={title} help={help(rule)} />
          <span id={titleId}>{title}</span>
        </span>
      }
      actions={
        <SetupRemoveButton
          label={t("remove_rule")}
          onClick={() => setActive(false)}
        />
      }
    >
      {body}
    </SetupCard>
  );
}

export default React.memo(PresetRuleCard);
