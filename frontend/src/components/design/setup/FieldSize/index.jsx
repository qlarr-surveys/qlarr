import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { changeAttribute } from "~/state/design/designState";
import { Trans, useTranslation } from "react-i18next";
import styles from "./FieldSize.module.css";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { Typography } from "@mui/material";

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
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);

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

  const lostFocus = (event) => {
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
    <>
      <div className={styles.label}>
        <CustomTooltip body={tTooltips(label)} />
        <Typography fontWeight={700}>{t(label)}:</Typography>
      </div>
      <TextField
        label={t(label)}
        error={isError}
        variant="outlined"
        type="number"
        helperText={
          isError ? (
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
          ) : null
        }
        size="small"
        sx={{ maxWidth: "200px" ,

          ml:2,
         }}
        value={value}
        onBlur={lostFocus}
        onChange={(event) => onValueChange(event)}
      />
    </>
  );
}

export default React.memo(FieldSize);
