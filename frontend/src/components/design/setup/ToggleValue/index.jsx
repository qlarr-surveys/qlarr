import React from "react";
import Switch from "@mui/material/Switch";
import styles from "./ToggleValue.module.css";
import { useDispatch } from "react-redux";
import { changeAttribute } from "~/state/design/designState";
import { useSelector } from "react-redux";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function ToggleValue({ label, code, rule, t }) {
  const dispatch = useDispatch();
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);

  const value = useSelector((state) => {
    return state.designState[code][rule] || false;
  });

  const onChange = (value) => {
    dispatch(changeAttribute({ code, key: rule, value }));
  };
  const swithLabel = { inputProps: { "aria-label": "Switch demo" } };

  return (
    <div className={styles.toggleValue}>
      <div className={styles.label}>
        <CustomTooltip body={tTooltips(label)} />
        <Typography fontWeight={700}>{t(label)}</Typography>
      </div>
      <Switch
        {...swithLabel}
        checked={value}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
    </div>
  );
}

export default ToggleValue;
