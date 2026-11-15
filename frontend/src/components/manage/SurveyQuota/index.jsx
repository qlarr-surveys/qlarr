import React, { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useSelector, useDispatch } from "react-redux";
import { surveyAttributeChanged } from "~/state/edit/editState";
import { isSurveyAdmin } from "~/constants/roles";
import { SURVEY_STATUS } from "~/constants/survey";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import {
  fieldStyles as fields,
  SettingRow,
  Switch,
} from "~/components/manage/SettingsFields";

const MAX_TOTAL = 10000;

const isValidLimit = (value) => {
  if (value === "") return true;
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= MAX_TOTAL;
};

/**
 * The cap on the survey's total responses: a switch, and the limit it applies.
 *
 * As before, turning the switch off saves `quota` -1 and clearing the limit
 * saves 0, both meaning no cap. A limit must be a whole number from 1 to
 * 10,000 — anything else says why as it is typed, where it used to be dropped
 * keystroke by keystroke without a word — and each valid one saves as it is
 * typed.
 */
function SurveyQuota() {
  const dispatch = useDispatch();
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const survey = useSelector((state) => state.editState.survey);

  const [checked, setChecked] = useState(survey?.quota > 0);
  const [limit, setLimit] = useState(survey?.quota > 0 ? String(survey.quota) : "");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const labelId = useId();
  const inputId = useId();
  const errorId = useId();

  // Follow the saved value, so a failed save that restores the server copy
  // shows it. 0 (a cleared limit) leaves the switch as it is.
  const saved = survey?.quota;
  useEffect(() => {
    setError("");
    setLimit(saved > 0 ? String(saved) : "");
    if (saved > 0) setChecked(true);
    else if (saved === -1) setChecked(false);
  }, [saved]);

  const disabled = !isSurveyAdmin() || survey?.status == SURVEY_STATUS.CLOSED;

  const save = (value) =>
    dispatch(surveyAttributeChanged({ key: "quota", value }));

  const onToggle = (next) => {
    setChecked(next);
    setError("");
    if (next) {
      // The switch alone limits nothing: the number is the next step.
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setLimit("");
      save(-1);
    }
  };

  const onLimit = (event) => {
    const value = event.target.value;
    setLimit(value);
    if (!isValidLimit(value)) {
      setError(t("edit_survey.quota_range"));
      return;
    }
    setError("");
    const quota = value === "" ? 0 : Number(value);
    if (quota !== survey?.quota) {
      save(quota);
    }
  };

  return (
    <SettingRow>
      <div className={fields.inline}>
        <CustomTooltip
          body={t("tooltips.quotas")}
          iconLabel={t("edit_survey.about_setting", {
            name: t("edit_survey.total_responses"),
          })}
        />
        <span id={labelId} className={fields.label}>
          {t("edit_survey.total_responses")}
        </span>
        <Switch
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          aria-labelledby={labelId}
        />
      </div>
      <label htmlFor={inputId} className={`${fields.subLabel} ${fields.below}`}>
        {t("label.total_responses_limit")}
        <input
          ref={inputRef}
          id={inputId}
          type="number"
          min={1}
          max={MAX_TOTAL}
          step={1}
          inputMode="numeric"
          placeholder={t("edit_survey.quota_placeholder")}
          value={limit}
          onChange={onLimit}
          disabled={disabled || !checked}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`${fields.input} ${error ? fields.inputInvalid : ""}`}
        />
      </label>
      {error && (
        <p id={errorId} role="alert" className={fields.error}>
          {error}
        </p>
      )}
    </SettingRow>
  );
}

export default React.memo(SurveyQuota);
