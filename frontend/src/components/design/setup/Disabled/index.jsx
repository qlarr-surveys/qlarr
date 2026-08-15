import React from "react";
import Switch from "@mui/material/Switch";
import styles from "./Disabled.module.css";
import { useDispatch, useSelector } from "react-redux";
import { changeRelevance } from "~/state/design/designState";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

export default function DisabledToggle({ code, t }) {
  const dispatch = useDispatch();
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);
  const rule =
    useSelector((s) => s.designState[code]?.relevance?.rule) ?? "show_always";
  const checked = rule === "hide_always";

  const onChange = (nextChecked) => {
    dispatch(
      changeRelevance({
        code,
        key: "relevance",
        value: {
          rule: nextChecked ? "hide_always" : "show_always",
          logic: undefined,
        },
      })
    );
  };
  return (
    <div className={styles.toggleValue}>
      <div className={styles.label}>
        <CustomTooltip body={tTooltips("disabled")} />
        <Typography fontWeight={700}>{t("disabled")}</Typography>
      </div>
      <Switch
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        inputProps={{ "aria-label": "disabled-switch" }}
      />
    </div>
  );
}
