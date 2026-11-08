// ResponsesExport.jsx
import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { useForm, Controller, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import FormProvider from "~/components/hook-form";
import FileSaver from "file-saver";
import { useService } from "~/hooks/use-service";
import { useParams } from "react-router-dom";
import {
  ALL_STATUSES,
  RangeFields,
  StatusesField,
  rangeAndStatusesSchema,
  responseIndexBounds,
} from "~/components/manage/ResponsesFilterFields";

const DEFAULT_VALUES = {
  range: "all",
  statuses: ALL_STATUSES,
  format: "csv",
  headers: "text",
  mode: "text",
};

const MIME_BY_FORMAT = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function exportResponsesFile(
  surveyService,
  surveyId,
  { range, from, to, statuses, format, headers, mode } = DEFAULT_VALUES
) {
  const { blob, fileName } = await surveyService.exportResponses(surveyId, {
    format,
    ...responseIndexBounds({ range, from, to }),
    dbValues: mode === "database",
    headers,
    statuses,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });

  if (!blob || blob.size === 0) return false;

  const file = new File([blob], fileName, {
    type: MIME_BY_FORMAT[format] || "application/octet-stream",
  });
  FileSaver.saveAs(file);
  return true;
}

export default function ResponsesExport({ 
  open, 
  onClose, 
  currentFrom = 1, 
  currentTo = 1, 
  onNoResponses,
  t 
}) {
  const { surveyId } = useParams();

  const surveyService = useService("survey");

  const Schema = yup.object().shape({
    ...rangeAndStatusesSchema(t),
    format: yup.string().oneOf(["csv", "xlsx"]).required(),
    headers: yup.string().oneOf(["code", "text"]).required(),
    mode: yup.string().oneOf(["database", "text"]).required(),
  });

  const methods = useForm({
    mode: "onChange",
    resolver: yupResolver(Schema),
    defaultValues: { ...DEFAULT_VALUES, from: currentFrom, to: currentTo },
  });

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = methods;
  const statuses = useWatch({ control, name: "statuses" });

  useEffect(() => {
    if (open) {
      reset({ ...DEFAULT_VALUES, from: currentFrom, to: currentTo });
    }
  }, [open, currentFrom, currentTo, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const exported = await exportResponsesFile(surveyService, surveyId, data);
      if (!exported) {
        onNoResponses?.();
        return;
      }
      onClose?.();
    } catch (error) {
      // already surfaced by the service's global error handler
      onClose?.();
    }
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("responses.export")}</DialogTitle>

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <DialogContent sx={{ display: "grid", gap: 2 }}>
          <RangeFields control={control} errors={errors} t={t} />

          <StatusesField control={control} t={t} />

          <FormControl>
            <FormLabel>{t("responses.export_type")}</FormLabel>
            <Controller
              name="format"
              control={control}
              render={({ field }) => (
                <RadioGroup row {...field}>
                  <FormControlLabel
                    value="csv"
                    control={<Radio />}
                    label={t("responses_export.format_csv")}
                  />
                  <FormControlLabel
                    value="xlsx"
                    control={<Radio />}
                    label={t("responses_export.format_excel")}
                  />
                </RadioGroup>
              )}
            />
          </FormControl>

          <FormControl>
            <FormLabel>{t("responses.header_type")}</FormLabel>
            <Controller
              name="headers"
              control={control}
              render={({ field }) => (
                <RadioGroup row {...field}>
                  <FormControlLabel
                    value="text"
                    control={<Radio />}
                    label={t("responses.text_headers")}
                  />
                  <FormControlLabel
                    value="code"
                    control={<Radio />}
                    label={t("responses.code_headers")}
                  />
                </RadioGroup>
              )}
            />
          </FormControl>

          <FormControl>
            <FormLabel>{t("responses.mode")}</FormLabel>
            <Controller
              name="mode"
              control={control}
              render={({ field }) => (
                <RadioGroup row {...field}>
                  <FormControlLabel
                    value="text"
                    control={<Radio />}
                    label={t("responses.text_format")}
                  />
                  <FormControlLabel
                    value="database"
                    control={<Radio />}
                    label={t("responses.database_format")}
                  />
                </RadioGroup>
              )}
            />
          </FormControl>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>{t("action_btn.cancel")}</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!statuses?.length}
          >
            {t("action_btn.export")}
          </Button>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}
