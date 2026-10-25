// ResponsesExport.jsx
import React, { useEffect, useState } from "react";
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
  Snackbar,
  Alert,
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

export default function ResponsesExport({ 
  open, 
  onClose, 
  currentFrom = 1, 
  currentTo = 1, 
  t 
}) {
  const { surveyId } = useParams();

  const surveyService = useService("survey");
  const [noResponses, setNoResponses] = useState(false);

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
    mode: yup.string().oneOf(["database", "text"]).required(),
  });

  const methods = useForm({
    mode: "onChange",
    resolver: yupResolver(Schema),
    defaultValues: {
      range: "all",
      from: currentFrom,
      to: currentTo,
      statuses: ALL_STATUSES,
      format: "csv",
      mode: "database",
    },
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
      reset({
        range: "all",
        from: currentFrom,
        to: currentTo,
        statuses: ALL_STATUSES,
        format: "csv",
        mode: "database",
      });
    }
  }, [open, currentFrom, currentTo, reset]);

  const onSubmit = handleSubmit(async (data) => {
    const allResponses = data.range === "all";
    const from = allResponses ? 1 : Number(data.from);
    const to = allResponses ? MAX_RESPONSE_INDEX : Number(data.to);
    const dbValues = data.mode === "database";
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    try {
      const blob = await surveyService.exportResponses(surveyId, {
        format: data.format,
        from,
        to,
        dbValues,
        statuses: data.statuses,
        timezone,
      });

      if (!blob || blob.size === 0) {
        setNoResponses(true);
        return;
      }

      const fileName = `${surveyId}-responses-export.${data.format}`;
      const mimeByFormat = {
        csv: "text/csv",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };

      const file = new File([blob], fileName, {
        type: mimeByFormat[data.format] || "application/octet-stream",
      });
      FileSaver.saveAs(file);
      onClose?.();
    } catch (error) {
      onClose?.();
      throw error;
    }
  });
  return (
    <>
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
            <FormLabel>{t("responses.mode")}</FormLabel>
            <Controller
              name="mode"
              control={control}
              render={({ field }) => (
                <RadioGroup row {...field}>
                  <FormControlLabel
                    value="database"
                    control={<Radio />}
                    label={t("responses.database_format")}
                  />
                  <FormControlLabel
                    value="text"
                    control={<Radio />}
                    label={t("responses.text_format")}
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
    <Snackbar
      open={noResponses}
      autoHideDuration={4000}
      onClose={() => setNoResponses(false)}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={() => setNoResponses(false)}
        severity="warning"
        sx={{ width: "100%" }}
      >
        {t("responses.no_responses_found")}
      </Alert>
    </Snackbar>
    </>
  );
}
