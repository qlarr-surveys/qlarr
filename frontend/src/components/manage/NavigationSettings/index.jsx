import React, { useMemo, useState } from "react";
import styles from "./NavigationSettings.module.css";
import { Box, MenuItem, Typography } from "@mui/material";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { RHFSelect, RHFSwitch } from "~/components/hook-form";
import { isSurveyAdmin } from "~/constants/roles";
import { useDispatch, useSelector } from "react-redux";
import { NAVIGATION_MODE, SURVEY_STATUS } from "~/constants/survey";
import {
  surveyAttributeChanged,
  surveyAttributeChangedImmediate,
} from "~/state/edit/editState";

const RESUME_EXPIRY_PRESETS = [
  { key: "1h", labelKey: "since_start.1h", fallback: "1 hour", ms: 3600000 },
  { key: "6h", labelKey: "since_start.6h", fallback: "6 hours", ms: 21600000 },
  { key: "1d", labelKey: "since_start.1d", fallback: "1 day", ms: 86400000 },
  { key: "3d", labelKey: "since_start.3d", fallback: "3 days", ms: 259200000 },
  { key: "1w", labelKey: "since_start.1w", fallback: "1 week", ms: 604800000 },
  {
    key: "1m",
    labelKey: "since_start.1m",
    fallback: "1 month",
    ms: 2592000000,
  },
  {
    key: "3m",
    labelKey: "since_start.3m",
    fallback: "3 months",
    ms: 7776000000,
  },
  {
    key: "6m",
    labelKey: "since_start.6m",
    fallback: "6 months",
    ms: 15552000000,
  },
  {
    key: "1y",
    labelKey: "since_start.1y",
    fallback: "1 year",
    ms: 31536000000,
  },
];

const findPresetByMs = (ms) => RESUME_EXPIRY_PRESETS.find((p) => p.ms === ms);
const findPresetByKey = (key) =>
  RESUME_EXPIRY_PRESETS.find((p) => p.key === key);

const NavigationSettings = () => {
  const dispatch = useDispatch();
  const survey = useSelector((state) => state.editState.survey);

  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const isDisabled = !isSurveyAdmin() || survey?.status == SURVEY_STATUS.CLOSED;

  const mode =
    survey?.surveyNavigationData?.navigationMode ??
    NAVIGATION_MODE.GROUP_BY_GROUP;

  const toggleDefs = useMemo(
    () => [
      {
        key: "allowPrevious",
        labelKey: "allow_previous",
        tooltipKey: "tooltips.allow_previous",
      },
      {
        key: "allowIncomplete",
        labelKey: "allow_incomplete",
        tooltipKey: "tooltips.allow_incomplete",
      },
      {
        key: "allowJump",
        labelKey: "allow_jump",
        tooltipKey: "tooltips.allow_jump",
      },
      {
        key: "skipInvalid",
        labelKey: "skip_invalid",
        tooltipKey: "tooltips.skip_invalid",
      },
    ],
    []
  );

  const [toggles, setToggles] = useState({
    allowPrevious: Boolean(survey?.surveyNavigationData?.allowPrevious),
    allowIncomplete: Boolean(survey?.surveyNavigationData?.allowIncomplete),
    allowJump: Boolean(survey?.surveyNavigationData?.allowJump),
    skipInvalid: Boolean(survey?.surveyNavigationData?.skipInvalid),
  });

  const [resumePresetKey, setResumePresetKey] = useState(
    findPresetByMs(survey?.surveyNavigationData?.resumeExpiryMillis)?.key ??
      "1w"
  );

  const handleToggleChange = (key) => (e) => {
    const next = e.target.checked;
    setToggles((prev) => ({ ...prev, [key]: next }));

    dispatch(surveyAttributeChanged({ key, value: next }));
  };

  const onNavigationModeChanged = (event) => {
    dispatch(
      surveyAttributeChangedImmediate({
        key: "navigationMode",
        value: event.target.value,
      })
    );
  };

  const onResumeExpiryChanged = (event) => {
    const key = event.target.value;
    setResumePresetKey(key);
    const preset = findPresetByKey(key);
    if (preset) {
      dispatch(
        surveyAttributeChanged({
          key: "resumeExpiryMillis",
          value: preset.ms,
        })
      );
    }
  };

  return (
    <Box className={styles.mainContainer}>
      <RHFSelect
        value={mode}
        disabled={isDisabled}
        label={t("navigation_mode")}
        onChange={onNavigationModeChanged}
      >
        <MenuItem value={NAVIGATION_MODE.GROUP_BY_GROUP}>
          {t("group_by_group")}
        </MenuItem>
        <MenuItem value={NAVIGATION_MODE.QUESTION_BY_QUESTION}>
          {t("question_by_question")}
        </MenuItem>
        <MenuItem value={NAVIGATION_MODE.ALL_IN_ONE}>
          {t("all_in_one")}
        </MenuItem>
      </RHFSelect>

      <RHFSelect
        value={resumePresetKey}
        disabled={isDisabled}
        label={t("response_expiry")}
        onChange={onResumeExpiryChanged}
      >
        {RESUME_EXPIRY_PRESETS.map((p) => (
          <MenuItem key={p.key} value={p.key}>
            {t(p.labelKey, p.fallback)}
          </MenuItem>
        ))}
      </RHFSelect>

      {toggleDefs.map(({ key, labelKey, tooltipKey }) => (
        <Box key={key} className={styles.boxContainer}>
          <Box display="flex" alignItems="center" gap=".5rem">
            <CustomTooltip body={t(tooltipKey)} />
            <Typography color="#1a2052" fontWeight="500">
              {t(labelKey)}
            </Typography>
          </Box>

          <RHFSwitch
            disabled={isDisabled}
            checked={Boolean(toggles[key])}
            onChange={handleToggleChange(key)}
          />
        </Box>
      ))}
    </Box>
  );
};

export default NavigationSettings;
