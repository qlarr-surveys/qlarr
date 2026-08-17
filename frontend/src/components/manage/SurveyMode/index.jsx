import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { FormControl, MenuItem, InputLabel, Select } from "@mui/material";
import { SURVEY_MODE } from "~/constants/survey";
import { KeyboardArrowDown } from "@mui/icons-material";

function CustomArrow(props) {
  return (
    <KeyboardArrowDown
      {...props}
      style={{
        color: "#181735",
      }}
    />
  );
}

export const SurveyMode = ({ surveyMode, onSurveyModeChanged }) => {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  return (
    <FormControl fullWidth>
      <InputLabel id="survey-mode-label">{t("label.survey_mode")}</InputLabel>
      <Select
        labelId="survey-mode-label"
        id="demo-simple-select"
        value={surveyMode}
        label={t("label.survey_mode")}
        onChange={onSurveyModeChanged}
        sx={{
          minWidth: "160px",
          borderRadius: "12px",
          backgroundColor: "#f7f8fc",
          "& .MuiOutlinedInput-notchedOutline": {
            border: "none",
          },
        }}
        IconComponent={CustomArrow}
      >
        <MenuItem value={SURVEY_MODE.WEB}>
          {t(`mode.${SURVEY_MODE.WEB}`)}
        </MenuItem>
        <MenuItem value={SURVEY_MODE.OFFLINE}>
          {t(`mode.${SURVEY_MODE.OFFLINE}`)}
        </MenuItem>
        <MenuItem value={SURVEY_MODE.MIXED}>
          {t(`mode.${SURVEY_MODE.MIXED}`)}
        </MenuItem>
      </Select>
    </FormControl>
  );
};
