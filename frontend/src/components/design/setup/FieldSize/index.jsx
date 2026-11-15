import React, { useId, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Trans } from "react-i18next";
import { changeAttribute } from "~/state/design/designState";
import {
  SetupField,
  SetupHint,
  setupFieldStyles as styles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

const cx = (...names) => names.filter(Boolean).join(" ");

function FieldSize({
  label,
  rule,
  t,
  defaultValue,
  code,
  lowerBound,
  upperBound,
}) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const id = useId();
  const hintId = useId();

  const stateValue = useSelector((state) => {
    return state.designState[code][rule] || defaultValue;
  });

  const [value, setValue] = useState(stateValue);

  const onValueChange = (event) => {
    const newValue = event.target.value;
    setValue(newValue);
    if (newValue >= lowerBound && newValue <= upperBound) {
      dispatch(
        changeAttribute({
          code,
          key: rule,
          value: Math.max(lowerBound, Math.min(upperBound, newValue)),
        })
      );
    }
  };

  const isError = value != stateValue;

  const lostFocus = () => {
    if (isError) {
      setValue(stateValue);
      dispatch(
        changeAttribute({
          code,
          key: rule,
          value: stateValue,
        })
      );
    }
  };

  return (
    <SetupField label={t(label)} help={help(label)} htmlFor={id}>
      <input
        id={id}
        type="number"
        min={lowerBound}
        max={upperBound}
        value={value}
        onBlur={lostFocus}
        onChange={onValueChange}
        aria-invalid={isError}
        aria-describedby={isError ? hintId : undefined}
        className={cx(styles.input, styles.inputShort, isError && styles.invalid)}
      />
      {isError && (
        <SetupHint id={hintId} error>
          <Trans
            t={t}
            values={{
              lower_bound: lowerBound,
              upper_bound: upperBound,
              setup_value: stateValue,
              label,
            }}
            i18nKey="value_beyond_bounds"
          />
        </SetupHint>
      )}
    </SetupField>
  );
}

export default React.memo(FieldSize);
