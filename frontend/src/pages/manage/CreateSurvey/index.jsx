import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
  Box,
  Button,
  Card,
  TextField,
  FormGroup,
  FormHelperText,
  Typography,
  Stack,
} from "@mui/material";

import { routes } from "~/routes";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import styles from "./CreateSurvey.module.css";
import { localDateToServerDateTime } from "~/utils/DateUtils";
import { SurveyMode } from "~/components/manage/SurveyMode";
import { SurveyActiveFromTo } from "~/components/manage/SurveyActiveFromTo";
import { SURVEY_MODE } from "~/constants/survey";
import { onError, setLoading } from "~/state/edit/editState";
import { useDispatch } from "react-redux";
import { useService } from "~/hooks/use-service";

function CreateSurvey() {
  const surveyService = useService("survey");

  const navigate = useNavigate();
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const dispatch = useDispatch();

  const [surveyName, setSurveyName] = useState("");
  const [surveyNameError, setSurveyNameError] = useState("");
  const [surveyDateError, setSurveyDateError] = useState("");

  const [surveyMode, setSurveyMode] = useState(SURVEY_MODE.MIXED);

  const [surveyActiveFrom, setSurveyActiveFrom] = useState(null);
  const [surveyActiveTo, setSurveyActiveTo] = useState(null);

  const onSurveyNameChanged = (e) => {
    setSurveyName(e.target.value);
    setSurveyNameError("");
  };

  const onSurveyModeChanged = (e) => {
    setSurveyMode(e.target.value);
  };

  const onSurveyActiveFromChanged = (value) => {
    setSurveyDateError("");
    setSurveyActiveFrom(value.toDate());
  };

  const onSurveyActiveToChanged = (value) => {
    setSurveyDateError("");
    setSurveyActiveTo(value.toDate());
  };

  const validate = () => {
    setSurveyNameError("");

    if (surveyName.length == 0) {
      setSurveyNameError(t("survey_required"));
      return false;
    }

    return true;
  };

  const goDashboard = () => {
    navigate(routes.dashboard);
  };

  const onSubmit = () => {
    if (!validate()) {
      return;
    }

    dispatch(setLoading(true));
    const data = {
      name: surveyName,
      usage: surveyMode,
    };

    if (surveyActiveFrom) {
      data.startDate = localDateToServerDateTime(surveyActiveFrom);
    }

    if (surveyActiveTo) {
      data.endDate = localDateToServerDateTime(surveyActiveTo);
    }

    surveyService
      .createSurvey(data)
      .then(() => {
        goDashboard();
      })
      .catch((processedError) => {
        if (
          processedError.name == PROCESSED_ERRORS.DUPLICATE_SURVEY_NAME.name
        ) {
          setSurveyNameError(t(`processed_errors.${processedError.name}`));
        } else if (
          processedError.name == PROCESSED_ERRORS.INVALID_SURVEY_DATES.name
        ) {
          setSurveyDateError(t(`processed_errors.${processedError.name}`));
        }
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
  };

  return (
    <Box className={styles.mainContainer}>
      <Card className={styles.createUserCard}>
        <Typography variant="h4">{t("create_survey.title")}</Typography>
        <FormGroup className={styles.formGroup}>
          <TextField
            sx={{ maxWidth: "400px" }}
            error={surveyNameError.length > 0}
            required={true}
            value={surveyName}
            id="surveyName"
            label={t("label.survey_name")}
            name="surveyName"
            onChange={onSurveyNameChanged}
            variant="standard"
          />
          {surveyNameError && (
            <FormHelperText className={styles.errorText}>
              {surveyNameError}
            </FormHelperText>
          )}
          <Stack flexDirection="row" gap={5} sx={{ mt: "40px" }}>
            <Box className={styles.blockItem}>
              <SurveyMode
                surveyMode={surveyMode}
                onSurveyModeChanged={onSurveyModeChanged}
              />
            </Box>
            <Box className={styles.blockItem}>
              <SurveyActiveFromTo
                error={surveyDateError}
                surveyActiveFrom={surveyActiveFrom}
                surveyActiveTo={surveyActiveTo}
                onSurveyActiveFromChanged={onSurveyActiveFromChanged}
                onSurveyActiveToChanged={onSurveyActiveToChanged}
              />
            </Box>
          </Stack>
        </FormGroup>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: "40px" }}>
          <Button onClick={goDashboard}>{t("action_btn.cancel")}</Button>
          <Button onClick={onSubmit}>{t("action_btn.save")}</Button>
        </Box>
      </Card>
    </Box>
  );
}

export default CreateSurvey;
