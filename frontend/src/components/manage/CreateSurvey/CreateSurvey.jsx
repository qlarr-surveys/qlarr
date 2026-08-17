import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { Box, Button, IconButton, Modal, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";
import * as Yup from "yup";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import styles from "./CreateSurvey.module.css";
import { SURVEY_MODE } from "~/constants/survey";
import { setLoading } from "~/state/edit/editState";
import { useDispatch } from "react-redux";
import FormProvider, { RHFSelect, RHFTextField } from "~/components/hook-form";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import LoadingButton from "@mui/lab/LoadingButton";
import { useService } from "~/hooks/use-service";
import { useNavigate } from "react-router-dom";

const surveyMode_options = [
  { value: SURVEY_MODE.WEB, label: `mode.${SURVEY_MODE.WEB}` },
  { value: SURVEY_MODE.OFFLINE, label: `mode.${SURVEY_MODE.OFFLINE}` },
  { value: SURVEY_MODE.MIXED, label: `mode.${SURVEY_MODE.MIXED}` },
];

function CreateSurvey({ open, onResult }) {
  const surveyService = useService("survey");
  const navigate = useNavigate();

  const { t } = useTranslation(NAMESPACES.MANAGE);
  const dispatch = useDispatch();

  const defaultValues = {
    surveyName: "",
    surveyMode: SURVEY_MODE.MIXED,
  };

  const CreateSurveySchema = useMemo(
    () =>
      Yup.object().shape({
        surveyName: Yup.string()
          .required(t("survey_required"))
          .max(50, t("survey_too_long")),
      }),
    [t]
  );

  const methods = useForm({
    resolver: yupResolver(CreateSurveySchema),
    defaultValues,
  });

  const {
    setError,
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open]);

  const onSubmit = handleSubmit(async (data) => {
    dispatch(setLoading(true));
    const model = {
      name: data.surveyName,
      usage: data.surveyMode,
    };

    surveyService
      .createSurvey(model)
      .then((res) => {
        onResult(true);
        navigate("/design-survey/" + res.id);
      })
      .catch((processedError) => {
        if (
          processedError.name == PROCESSED_ERRORS.DUPLICATE_SURVEY_NAME.name
        ) {
          setError("surveyName", {
            type: "manual",
            message: t(`processed_errors.${processedError.name}`),
          });
        }
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
  });

  return (
    <Modal
      sx={{
        ".MuiBackdrop-root": {
          backgroundColor: "rgba(0, 0, 0, 0.3)",
        },
      }}
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          onResult(false);
        }
      }}
      closeAfterTransition
      disableEscapeKeyDown={false}
    >
      <Box className={styles.wrapper}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography fontWeight={600} variant="h5">
            {t("create_new_survey")}
          </Typography>
          <IconButton
            onClick={() => onResult(false)}
            sx={{
              color: "text.secondary",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
            aria-label="close"
          >
            <Close />
          </IconButton>
        </Box>

        <FormProvider methods={methods} onSubmit={onSubmit}>
          <Box display="flex" flexDirection="column" gap={2}>
            <RHFTextField name="surveyName" label={t("label.survey_name")} />

            <RHFSelect name="surveyMode" label={t("label.survey_mode")}>
              {surveyMode_options.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </RHFSelect>
          </Box>

          <Box className={styles.footer}>
            <Button onClick={() => onResult(false)} color="inherit">
              {t("action_btn.cancel")}
            </Button>
            <LoadingButton
              type="submit"
              variant="contained"
              color="primary"
              loading={isSubmitting}
            >
              {t("action_btn.create")}
            </LoadingButton>
          </Box>
        </FormProvider>
      </Box>
    </Modal>
  );
}

export default CreateSurvey;
