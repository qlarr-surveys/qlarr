import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useSelector, useDispatch } from "react-redux";
import { surveyAttributeChanged } from "~/state/edit/editState";
import { SURVEY, SURVEY_STATUS } from "~/constants/survey";
import { isSurveyAdmin } from "~/constants/roles";
import { ToggleRow } from "~/components/manage/SettingsFields";

/** The Privacy card's rows: what is stored with each response. */
function SurveyPrivacy() {
  const dispatch = useDispatch();
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const survey = useSelector((state) => state.editState.survey);
  const disabled = !isSurveyAdmin() || survey.status == SURVEY_STATUS.CLOSED;

  const change = (key) => (value) =>
    dispatch(surveyAttributeChanged({ key, value }));

  return (
    <>
      <ToggleRow
        label={t("edit_survey.save_ip")}
        checked={Boolean(survey.saveIp)}
        onChange={change(SURVEY.SAVE_IP)}
        disabled={disabled}
      />
      <ToggleRow
        label={t("edit_survey.save_timings")}
        checked={Boolean(survey.saveTimings)}
        onChange={change(SURVEY.SAVE_TIMINGS)}
        disabled={disabled}
      />
    </>
  );
}

export default React.memo(SurveyPrivacy);
