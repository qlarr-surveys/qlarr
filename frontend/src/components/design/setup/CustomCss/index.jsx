import React from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { changeAttribute, changeCustomCss } from "~/state/design/designState";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function CustomCSS({ code, t }) {
  const dispatch = useDispatch();
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);

  const inputValue = useSelector((state) => {
    return state.designState[code].customCss;
  });

  const setCss = (event) => {
    console.log("value", event.target.value);
    dispatch(
      changeCustomCss({ code, value: event.target.value })
    );
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <CustomTooltip body={`${tTooltips("custom_css")}\n\n${tTooltips("expression_reference")}`} />
        <Typography fontWeight={700}>{t("custom_css")}</Typography>
      </div>
      <TextField
        fullWidth
        multiline
        minRows={4}
        maxRows={25}
        value={inputValue}
        onChange={setCss}
        placeholder={`/* Enter your CSS code here... */
  background-color: #007bff;
  color: white;
`}
        variant="outlined"
      />
    </>
  );
}

export default CustomCSS;
