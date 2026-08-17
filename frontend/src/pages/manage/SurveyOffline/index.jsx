import React from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useSelector, useDispatch } from "react-redux";
import { Box, Typography } from "@mui/material";
import { surveyAttributeChanged } from "~/state/edit/editState";
import { SURVEY, SURVEY_STATUS } from "~/constants/survey";
import styles from "./SurveyOffline.module.css";
import { isSurveyAdmin } from "~/constants/roles";
import { RHFSwitch } from "~/components/hook-form";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";

function SurveyOffline() {
  const dispatch = useDispatch();
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const survey = useSelector((state) => state.editState.survey);
  const isDisabled = !isSurveyAdmin() || survey.status == SURVEY_STATUS.CLOSED;

  const onChangeCheckbox = (e) => {
    dispatch(
      surveyAttributeChanged({
        key: e.target.name,
        value: e.target.checked,
      })
    );
  };

  return (
    <Box className={styles.mainContainer}>
      <Box className={styles.boxContainer}>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <CustomTooltip
            title="Background Audio"
            body="This option allows you to add background audio to your survey."
            url="https://example.com/background-audio"
          />

          <Typography color="#1a2052" fontWeight="500">
            {t("edit_survey.background_audio")}
          </Typography>
        </div>

        <RHFSwitch
          disabled={isDisabled}
          name={SURVEY.BACKGROUND_AUDIO}
          checked={survey.backgroundAudio}
          onChange={onChangeCheckbox}
        />
      </Box>
      <Box className={styles.boxContainer}>
        <Typography color="#1a2052" fontWeight="500">
          {t("edit_survey.record_gps")}
        </Typography>
        <RHFSwitch
          disabled={isDisabled}
          name={SURVEY.RECORD_GPS}
          checked={survey.recordGps}
          onChange={onChangeCheckbox}
        />
      </Box>
    </Box>
  );
}

export default React.memo(SurveyOffline);
