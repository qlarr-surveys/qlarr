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
  Radio,
  FormHelperText,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import FormProvider from "~/components/hook-form";
import FileSaver from "file-saver";
import { useService } from "~/hooks/use-service";
import { useParams } from "react-router-dom";

export default function ResponsesExport({ 
  open, 
  onClose, 
  currentFrom = 1, 
  currentTo = 1, 
  t 
}) {
  const { surveyId } = useParams();

  const surveyService = useService("survey");

  const min = 1;

  const Schema = yup.object().shape({
    from: yup
      .number()
      .typeError(t("responses.enter_a_number"))
      .required(t("responses.enter_a_number"))
      .min(min, t("responses.min", { min })),
    to: yup
      .number()
      .typeError(t("responses.enter_a_number"))
      .required(t("responses.enter_a_number"))
      .min(min, t("responses.min", { min }))
      .test("gte-from", t("responses.range_invalid"), function (value) {
        const { from } = this.parent;
        if (typeof from !== "number" || typeof value !== "number") return false;
        return value >= from;
      }),
    filter: yup.string().oneOf(["all", "complete", "incomplete"]).required(),
    format: yup.string().oneOf(["csv", "xlsx", "ods"]).required(),
    mode: yup.string().oneOf(["database", "text"]).required(),
  });

  const methods = useForm({
    mode: "onChange",
    resolver: yupResolver(Schema),
    defaultValues: {
      from: currentFrom,
      to: currentTo,
      filter: "all",
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

  useEffect(() => {
    if (open) {
      reset({
        from: currentFrom,
        to: currentTo,
        filter: "all",
        format: "csv",
        mode: "database",
      });
    }
  }, [open, currentFrom, currentTo, reset]);

  const onSubmit = handleSubmit(async (data) => {
    const from = Number(data.from);
    const to = Number(data.to);
    const complete =
      data.filter === "all" ? null : data.filter === "complete" ? true : false;
    const dbValues = data.mode === "database";
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    try {
      const blob = await surveyService.exportResponses(surveyId, {
        format: data.format,
        from,
        to,
        dbValues,
        complete,
        timezone,
      });

      const fileName = `${surveyId}-responses-export.${data.format}`;
      const mimeByFormat = {
        csv: "text/csv",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ods: "application/vnd.oasis.opendocument.spreadsheet",
      };

      const file = new File([blob], fileName, {
        type: mimeByFormat[data.format] || "application/octet-stream",
      });
      FileSaver.saveAs(file);
    } finally {
      onClose?.();
    }
  });
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("responses.export")}</DialogTitle>

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <DialogContent sx={{ display: "grid", gap: 2 }}>
          <Box display="flex" gap={2}>
            <Controller
              name="from"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t("responses.from")}
                  type="number"
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
            <FormLabel>{t("responses.responses_type")}</FormLabel>
            <Controller
              name="filter"
              control={control}
              render={({ field }) => (
                <RadioGroup row {...field}>
                  <FormControlLabel
                    value="all"
                    control={<Radio />}
                    label={t("responses.filter_completed_show_all")}
                  />
                  <FormControlLabel
                    value="complete"
                    control={<Radio />}
                    label={t("responses.complete_responses")}
                  />
                  <FormControlLabel
                    value="incomplete"
                    control={<Radio />}
                    label={t("responses.incomplete_responses")}
                  />
                </RadioGroup>
              )}
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
                  <FormControlLabel
                    value="ods"
                    control={<Radio />}
                    label={t("responses_export.format_ods")}
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
          <Button type="submit" variant="contained">
            {t("action_btn.export")}
          </Button>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}
