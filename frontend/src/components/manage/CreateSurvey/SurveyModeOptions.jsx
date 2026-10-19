import React from "react";
import { Box, Typography } from "@mui/material";
import { SURVEY_MODE } from "~/constants/survey";

/**
 * The survey-mode choices, each with a one-line hint.
 *
 * The mode decides where responses can be collected and is awkward to change
 * later, so the dialog explains the options rather than listing three nouns.
 * `mode.*` is existing copy; only the hints are new.
 */
export const SURVEY_MODE_OPTIONS = [
  SURVEY_MODE.WEB,
  SURVEY_MODE.OFFLINE,
  SURVEY_MODE.MIXED,
].map((mode) => ({
  value: mode,
  labelKey: `mode.${mode}`,
  hintKey: `label.survey_mode_hint.${mode}`,
}));

/** The label and hint, as a MenuItem's contents. */
export function SurveyModeOption({ labelKey, hintKey, t }) {
  return (
    <Box>
      <Typography component="span" sx={{ display: "block", fontSize: 15 }}>
        {t(labelKey)}
      </Typography>
      <Typography
        component="span"
        sx={{ display: "block", mt: "1px", fontSize: 12.5, color: "#6b7194" }}
      >
        {t(hintKey)}
      </Typography>
    </Box>
  );
}

/**
 * The collapsed field shows the label alone. Without this the Select would
 * render the whole selected MenuItem, hint included, inside the input.
 */
export function renderSurveyMode(t) {
  return (value) => {
    const option = SURVEY_MODE_OPTIONS.find((o) => o.value === value);
    return option ? t(option.labelKey) : "";
  };
}
