import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { isSurveyAdmin } from "~/constants/roles";
import { useDispatch, useSelector } from "react-redux";
import { NAVIGATION_MODE, SURVEY_STATUS } from "~/constants/survey";
import {
  surveyAttributeChanged,
  surveyAttributeChangedImmediate,
} from "~/state/edit/editState";
import {
  FieldHead,
  Select,
  SettingRow,
  ToggleRow,
} from "~/components/manage/SettingsFields";

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

const TOGGLES = [
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
];

/**
 * The Navigation card's rows: how respondents move through the survey.
 *
 * A change is written as a top-level key of the survey (`allowPrevious`), which
 * is what the save request takes; the server merges it into
 * `surveyNavigationData` and answers without the top-level copy. So each value
 * is read from the top-level key first: right after a change it holds what was
 * just picked, and once the save comes back, or the server's copy replaces a
 * failed one, it is gone and the server's value shows.
 */
const NavigationSettings = () => {
  const dispatch = useDispatch();
  const survey = useSelector((state) => state.editState.survey);
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);

  const disabled = !isSurveyAdmin() || survey?.status == SURVEY_STATUS.CLOSED;
  const read = (key) => survey?.[key] ?? survey?.surveyNavigationData?.[key];

  const mode = read("navigationMode") ?? NAVIGATION_MODE.GROUP_BY_GROUP;
  const resumePresetKey =
    findPresetByMs(read("resumeExpiryMillis"))?.key ?? "1w";

  const onNavigationModeChanged = (event) => {
    dispatch(
      surveyAttributeChangedImmediate({
        key: "navigationMode",
        value: event.target.value,
      })
    );
  };

  const onResumeExpiryChanged = (event) => {
    const preset = findPresetByKey(event.target.value);
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
    <>
      <SettingRow>
        <FieldHead
          label={t("navigation_mode")}
          htmlFor="settings-navigation-mode"
        />
        <Select
          id="settings-navigation-mode"
          value={mode}
          disabled={disabled}
          onChange={onNavigationModeChanged}
        >
          <option value={NAVIGATION_MODE.GROUP_BY_GROUP}>
            {t("group_by_group")}
          </option>
          <option value={NAVIGATION_MODE.QUESTION_BY_QUESTION}>
            {t("question_by_question")}
          </option>
          <option value={NAVIGATION_MODE.ALL_IN_ONE}>{t("all_in_one")}</option>
        </Select>
      </SettingRow>

      <SettingRow>
        <FieldHead
          label={t("response_expiry")}
          htmlFor="settings-response-expiry"
        />
        <Select
          id="settings-response-expiry"
          value={resumePresetKey}
          disabled={disabled}
          onChange={onResumeExpiryChanged}
        >
          {RESUME_EXPIRY_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {t(p.labelKey, p.fallback)}
            </option>
          ))}
        </Select>
      </SettingRow>

      {TOGGLES.map(({ key, labelKey, tooltipKey }) => (
        <ToggleRow
          key={key}
          label={t(labelKey)}
          help={t(tooltipKey)}
          checked={Boolean(read(key))}
          onChange={(value) => dispatch(surveyAttributeChanged({ key, value }))}
          disabled={disabled}
        />
      ))}
    </>
  );
};

export default NavigationSettings;
