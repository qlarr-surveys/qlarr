import styles from "./ValidationSetupValue.module.css";
import { useDispatch } from "react-redux";
import { changeValidationValue } from "~/state/design/designState";
import { useSelector } from "react-redux";
import FileType from "../../FileType";
import React, { useState } from "react";
import { Trans } from 'react-i18next';
import {
  SetupHint,
  setupFieldStyles,
} from "~/components/design/setup/SetupFields";

const cx = (...names) => names.filter(Boolean).join(" ");

function ValidationSetupValue({ code, validation, rule, t }) {
  const childCount = useSelector((state) => {
    return state.designState[code].children?.length || 0;
  });
  const bounds = React.useMemo(() => {
    switch (rule) {
      case "validation_min_char_length":
        return [1, Number.MAX_VALUE];
      case "validation_max_file_size":
        return [1, Number.MAX_VALUE];
      case "validation_max_char_length":
        return [1, Number.MAX_VALUE];
      case "validation_max_word_count":
        return [1, Number.MAX_VALUE];
      case "validation_min_word_count":
        return [1, Number.MAX_VALUE];
      case "validation_min_ranking_count":
      case "validation_min_option_count":
      case "validation_max_ranking_count":
      case "validation_max_option_count":
      case "validation_ranking_count":
      case "validation_option_count":
        return [1, childCount];
      default:
        return undefined;
    }
  }, [childCount]);

  const dispatch = useDispatch();

  const onChange = (key, value) => {
    dispatch(changeValidationValue({ rule, code, key, value }));
  };

  const onValuesUpdate = (key, value) => {
    onChange(
      key,
      typeof bounds === "undefined"
        ? value
        : Math.max(bounds[0], Math.min(bounds[1], value))
    );
  };

  let keys = validationAttributes(validation);

  const hasSubtitle =
    rule != "validation_required" &&
    rule != "validation_one_response_per_col" &&
    rule != "validation_pattern_email" &&
    rule != "validation_file_types";

  // Nothing to set, e.g. Required: no empty row in the rule's body.
  if (rule != "validation_file_types" && keys.length === 0) {
    return null;
  }

  return (
    <div className={styles.valueValidationItemsContainer}>
      {keys && hasSubtitle && (
        <span className={styles.subtitle}>{t(rule + "_subtitle")}</span>
      )}
      <div className={styles.valueValidationItems}>
        {rule == "validation_file_types" ? (
          <FileType
            value={validation.fileTypes}
            onValueChanged={(value) => onValuesUpdate("fileTypes", value)}
          />
        ) : (
          keys.map((i) => (
            <ValidationInput
              key={i}
              t={t}
              label={hasSubtitle ? t(rule + "_subtitle") : t(rule + "_title")}
              initialValue={validation[i]}
              bounds={bounds}
              validationType={typeof validation[i]}
              onValuesUpdate={(value) => onValuesUpdate(i, value)}
            />
          ))
        )}
      </div>
    </div>
  );
}

const ValidationInput = ({
  t,
  label,
  initialValue,
  validationType,
  onValuesUpdate,
  bounds,
}) => {
  const hintId = React.useId();
  const [value, setValue] = useState(initialValue);
  const isInError = value != initialValue;
  const onValueChange = (event) => {
    const newValue =
      validationType === "number"
        ? parseInt(event.target.value) || ""
        : event.target.value;
    setValue(newValue);
    if (
      typeof bounds !== "undefined" &&
      (newValue < bounds[0] || newValue > bounds[1])
    ) {
      setValue(newValue);
    } else {
      onValuesUpdate(newValue);
    }
  };
  return (
    <div className={styles.valueField}>
      <input
        value={value}
        type={validationType === "number" ? "number" : "text"}
        dir="auto"
        aria-label={label}
        aria-invalid={isInError}
        aria-describedby={isInError ? hintId : undefined}
        onChange={onValueChange}
        className={cx(
          setupFieldStyles.input,
          setupFieldStyles.inputShort,
          isInError && setupFieldStyles.invalid
        )}
      />
      {isInError && (
        <SetupHint id={hintId} error>
          <Trans
            t={t}
            values={{
              setup_value: initialValue,
            }}
            i18nKey="value_beyond_bounds_no_label"
          />
        </SetupHint>
      )}
    </div>
  );
};

const validationAttributes = (validation) => {
  return Object.keys(validation).filter(
    (el) =>
      ![
        "content",
        "isActive",
        "isCustomErrorActive",
        "bounds",
        "fileTypes",
      ].includes(el)
  );
};

export default ValidationSetupValue;
