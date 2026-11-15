import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useSelector, useDispatch } from "react-redux";
import { surveyAttributeChanged } from "~/state/edit/editState";
import { SURVEY, SURVEY_STATUS } from "~/constants/survey";
import { isSurveyAdmin } from "~/constants/roles";
import { ToggleRow } from "~/components/manage/SettingsFields";

/** The Offline card's rows: what the mobile app records alongside answers. */
function SurveyOffline() {
  const dispatch = useDispatch();
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const survey = useSelector((state) => state.editState.survey);
  const disabled = !isSurveyAdmin() || survey.status == SURVEY_STATUS.CLOSED;

  const change = (key) => (value) =>
    dispatch(surveyAttributeChanged({ key, value }));

  return (
    <>
      <ToggleRow
        label={t("edit_survey.background_audio")}
        help={t("tooltips.background_audio")}
        checked={Boolean(survey.backgroundAudio)}
        onChange={change(SURVEY.BACKGROUND_AUDIO)}
        disabled={disabled}
      />
      <ToggleRow
        label={t("edit_survey.record_gps")}
        checked={Boolean(survey.recordGps)}
        onChange={change(SURVEY.RECORD_GPS)}
        disabled={disabled}
      />
    </>
  );
}

export default React.memo(SurveyOffline);
