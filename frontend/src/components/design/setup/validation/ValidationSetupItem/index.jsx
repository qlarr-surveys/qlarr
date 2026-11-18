import React from "react";
import styles from "./ValidationSetupItem.module.css";
import ValidationSetupMessage from "~/components/design/setup/validation/ValidationSetupMessage";
import ValidationSetupValue from "~/components/design/setup/validation/ValidationSetupValue";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { changeValidationValue } from "~/state/design/designState";
import {
  SetupToggle,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

function ValidationSetupItem({ rule, t, code, isQuickOptions }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const validationRule = useSelector((state) => {
    return state.designState[code]?.validation?.[rule];
  });

  const isActive = validationRule?.isActive || false;

  const checkedValidationItem = (checked) => {
    dispatch(
      changeValidationValue({
        code,
        rule: rule,
        key: "isActive",
        value: checked,
      })
    );
  };

  return (
    <SetupToggle
      label={t(rule + "_title")}
      help={help(rule)}
      checked={isActive}
      onChange={checkedValidationItem}
    >
      {isActive && !isQuickOptions && (
        <div className={styles.boxContainer}>
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
      )}
    </SetupToggle>
  );
}

export default React.memo(ValidationSetupItem);
