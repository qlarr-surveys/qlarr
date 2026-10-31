// ResponsesExport.jsx
import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  FormGroup,
  Radio,
  Checkbox,
  FormHelperText,
} from "@mui/material";
import { useForm, Controller, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import FormProvider from "~/components/hook-form";
import FileSaver from "file-saver";
import { useService } from "~/hooks/use-service";
import { useParams } from "react-router-dom";

/**
 * The statuses an export can include. Each non-preview response is in exactly
 * one: a disqualified response is only "disqualified", submitted or not.
 */
const EXPORT_STATUSES = [
  { value: "complete", label: "responses.status_complete" },
  { value: "incomplete", label: "responses.status_incomplete" },
  { value: "disqualified", label: "responses.disqualified" },
];
const ALL_STATUSES = EXPORT_STATUSES.map((s) => s.value);
const MAX_RESPONSE_INDEX = 2147483647;

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
  const allResponses = range === "all";
  const blob = await surveyService.exportResponses(surveyId, {
    format,
    from: allResponses ? 1 : Number(from),
    to: allResponses ? MAX_RESPONSE_INDEX : Number(to),
    dbValues: mode === "database",
    headers,
    statuses,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });

  if (!blob || blob.size === 0) return false;

  const file = new File([blob], `${surveyId}-responses-export.${format}`, {
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

  const min = 1;

  const Schema = yup.object().shape({
    range: yup.string().oneOf(["all", "custom"]).required(),
    from: yup.mixed().when("range", {
      is: "custom",
      then: () =>
        yup
          .number()
          .typeError(t("responses.enter_a_number"))
          .required(t("responses.enter_a_number"))
          .min(min, t("responses.min", { min })),
    }),
    to: yup.mixed().when("range", {
      is: "custom",
      then: () =>
        yup
          .number()
          .typeError(t("responses.enter_a_number"))
          .required(t("responses.enter_a_number"))
          .min(min, t("responses.min", { min }))
          .test("gte-from", t("responses.range_invalid"), function (value) {
            const { from } = this.parent;
            if (typeof from !== "number" || typeof value !== "number") return false;
            return value >= from;
          }),
    }),
    statuses: yup.array().of(yup.string().oneOf(ALL_STATUSES)).min(1),
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
  const range = useWatch({ control, name: "range" });

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
      onClose?.();
      throw error;
    }
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("responses.export")}</DialogTitle>

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <DialogContent sx={{ display: "grid", gap: 2 }}>
          <Controller
            name="range"
            control={control}
            render={({ field }) => (
              <RadioGroup row {...field}>
                <FormControlLabel
                  value="all"
                  control={<Radio />}
                  label={t("responses.all_responses")}
                />
                <FormControlLabel
                  value="custom"
                  control={<Radio />}
                  label={t("responses.custom_range")}
                />
              </RadioGroup>
            )}
          />
          <Box display="flex" gap={2}>
            <Controller
              name="from"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t("responses.from")}
                  type="number"
                  disabled={range !== "custom"}
                  inputProps={{ min }}
                  error={!!errors.from}
                  helperText={errors.from?.message || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? "" : Number(v));
                  }}
                />
              )}
            />

            <Controller
              name="to"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t("responses.to")}
                  type="number"
                  disabled={range !== "custom"}
                  inputProps={{ min }}
                  error={!!errors.to}
                  helperText={errors.to?.message || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? "" : Number(v));
                  }}
                />
              )}
            />
          </Box>

          <FormControl>
            <Controller
              name="statuses"
              control={control}
              render={({ field }) => {
                const picked = field.value;
                // Kept in EXPORT_STATUSES order.
                const toggle = (value) =>
                  field.onChange(
                    picked.includes(value)
                      ? picked.filter((v) => v !== value)
                      : ALL_STATUSES.filter(
                          (v) => v === value || picked.includes(v)
                        )
                  );
                return (
                  <>
                    <FormLabel>{t("responses.responses_type")}</FormLabel>
                    <FormGroup row>
                      {EXPORT_STATUSES.map(({ value, label }) => (
                        <FormControlLabel
                          key={value}
                          control={
                            <Checkbox
                              checked={picked.includes(value)}
                              onChange={() => toggle(value)}
                            />
                          }
                          label={t(label)}
                        />
                      ))}
                    </FormGroup>
                  </>
                );
              }}
            />
            <FormHelperText sx={{ color: "warning.main" ,ml:0 }}>
              {t("responses.preview_not_exportable")}
            </FormHelperText>
          </FormControl>

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
