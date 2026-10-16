import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Typography,
  TextField
} from "@mui/material";
import {
  surveyAttributeChanged,
} from "~/state/edit/editState";
import { isSurveyAdmin } from "~/constants/roles";
import { SURVEY_STATUS } from "~/constants/survey";
import styles from "./SurveyQuota.module.css";
import { RHFSwitch } from "~/components/hook-form";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";

function SurveyQuota() {
  const dispatch = useDispatch();
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const survey = useSelector((state) => state.editState.survey);

  const [checked, setChecked] = useState(survey?.quota > 0);
  const [limit, setLimit] = useState(survey?.quota >= 0 ? survey.quota : "");

  const changeLimit = (value) => {
    const intValue = parseInt(value);
    if (Number.isInteger(intValue) && intValue >= 0) {
      setLimit(intValue);
      dispatch(
        surveyAttributeChanged({
          key: "quota",
          value: intValue,
        })
      );
    }
  };

  const onChangeCheckbox = (e) => {
    if (!e.target.checked) {
      setLimit("");
      dispatch(
        surveyAttributeChanged({
          key: "quota",
          value: -1,
        })
      );
    }
    setChecked(e.target.checked);
  };

  const isDisabled =
    !isSurveyAdmin() || survey?.status == SURVEY_STATUS.CLOSED;

  return (
    <Box className={styles.mainContainer}>
      <Box className={styles.boxContainer}>
        <Box display="flex" alignItems="center" gap=".5rem">
          <CustomTooltip body={t("tooltips.quotas")} />
          <Typography color="#1a2052" fontWeight="600" variant="subtitle1">
            {t("edit_survey.total_responses")}
          </Typography>
        </Box>
        <RHFSwitch
          disabled={isDisabled}
          checked={checked}
          onChange={onChangeCheckbox}
        />
      </Box>
      {checked && (
        <TextField
          size="small"
          type="number"
          sx={{ width: 240 }}
          disabled={isDisabled}
          label={t("label.total_responses_limit")}
          value={limit === 0 ? "" : limit}
          inputProps={{
            min: 0,
            max: 10000,
            inputMode: "numeric",
          }}
          onChange={(e) => {
            let newLimit =
              e.target.value === "" ? 0 : parseInt(e.target.value);
            if (!isNaN(newLimit) && newLimit >= 0 && newLimit <= 10000) {
              changeLimit(newLimit);
            }
          }}
        />
      )}
    </Box>
  );
}

export default React.memo(SurveyQuota);
