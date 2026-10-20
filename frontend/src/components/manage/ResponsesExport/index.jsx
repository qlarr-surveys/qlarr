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
import styles from "./ResponsesExport.module.css";

export default function ResponsesExport({
  open,
  onClose,
  // The range of response indices to prefill. A caller that has the rows on
  // screen passes the span it is showing; one that does not -- a dashboard
  // card -- passes neither and the dialog goes and finds the real span.
  currentFrom,
  currentTo,
  t,
  // The responses page is on a route that names the survey, so it passes
  // nothing and the param answers. The dashboard is not -- a card opens this
  // for one survey out of the many on screen -- so it says which.
  surveyId: surveyIdProp,
}) {
  const { surveyId: routeSurveyId } = useParams();
  const surveyId = surveyIdProp ?? routeSurveyId;

  const surveyService = useService("survey");

  const min = 1;

  // A response's index is not its position in the count: previews and deleted
  // responses take numbers too, so a survey showing two responses can hold
  // #3 and #4. Prefilling 1..count would then export an empty range and hand
  // back an empty file with nothing to say why, so when the caller does not
  // know the span we ask for it: 1 is always a safe floor, and the last page
  // of the summary carries the highest index there is.
  const [foundRange, setFoundRange] = useState(null);
  const knowsRange = currentFrom != null && currentTo != null;
  const from = knowsRange ? currentFrom : foundRange?.from ?? min;
  const to = knowsRange ? currentTo : foundRange?.to ?? min;

  useEffect(() => {
    if (!open || knowsRange) return;
    let cancelled = false;
    (async () => {
      try {
        const first = await surveyService.allResponse(surveyId, 1, 1);
        const total = first?.totalCount ?? 0;
        if (total < 1) return;
        const last = await surveyService.allResponse(surveyId, total, 1);
        const indices = (last?.responses ?? []).map((r) => r.index);
        if (cancelled || !indices.length) return;
        setFoundRange({ from: min, to: Math.max(...indices) });
      } catch {
        // Leave the prefill alone: the fields are editable and the range is
        // the one thing in this dialog the person can always set by hand.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, knowsRange, surveyId, surveyService]);

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
      from,
      to,
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
        from,
        to,
        filter: "all",
        format: "csv",
        mode: "database",
      });
    }
  }, [open, from, to, reset]);

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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{ className: styles.paper }}
    >
      <DialogTitle className={styles.title}>{t("responses.export")}</DialogTitle>

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <DialogContent className={styles.content}>
          <Box className={styles.range}>
            <Controller
              name="from"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  className={styles.field}
                  variant="outlined"
                  size="small"
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
                  className={styles.field}
                  variant="outlined"
                  size="small"
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

          <FormControl className={styles.group}>
            <FormLabel className={styles.groupLabel}>{t("responses.responses_type")}</FormLabel>
            <Controller
              name="filter"
              control={control}
              render={({ field }) => (
                <RadioGroup row className={styles.radioRow} {...field}>
                  <FormControlLabel
                    className={styles.radioLabel}
                    value="all"
                    control={<Radio className={styles.radio} />}
                    label={t("responses.filter_completed_show_all")}
                  />
                  <FormControlLabel
                    className={styles.radioLabel}
                    value="complete"
                    control={<Radio className={styles.radio} />}
                    label={t("responses.complete_responses")}
                  />
                  <FormControlLabel
                    className={styles.radioLabel}
                    value="incomplete"
                    control={<Radio className={styles.radio} />}
                    label={t("responses.incomplete_responses")}
                  />
                </RadioGroup>
              )}
            />
            <FormHelperText className={styles.warning}>
              {t("responses.preview_not_exportable")}
            </FormHelperText>
          </FormControl>

          <FormControl className={styles.group}>
            <FormLabel className={styles.groupLabel}>{t("responses.export_type")}</FormLabel>
            <Controller
              name="format"
              control={control}
              render={({ field }) => (
                <RadioGroup row className={styles.radioRow} {...field}>
                  <FormControlLabel
                    className={styles.radioLabel}
                    value="csv"
                    control={<Radio className={styles.radio} />}
                    label={t("responses_export.format_csv")}
                  />
                  <FormControlLabel
                    className={styles.radioLabel}
                    value="xlsx"
                    control={<Radio className={styles.radio} />}
                    label={t("responses_export.format_excel")}
                  />
                  <FormControlLabel
                    className={styles.radioLabel}
                    value="ods"
                    control={<Radio className={styles.radio} />}
                    label={t("responses_export.format_ods")}
                  />
                </RadioGroup>
              )}
            />
          </FormControl>

          <FormControl className={styles.group}>
            <FormLabel className={styles.groupLabel}>{t("responses.mode")}</FormLabel>
            <Controller
              name="mode"
              control={control}
              render={({ field }) => (
                <RadioGroup row className={styles.radioRow} {...field}>
                  <FormControlLabel
                    className={styles.radioLabel}
                    value="database"
                    control={<Radio className={styles.radio} />}
                    label={t("responses.database_format")}
                  />
                  <FormControlLabel
                    className={styles.radioLabel}
                    value="text"
                    control={<Radio className={styles.radio} />}
                    label={t("responses.text_format")}
                  />
                </RadioGroup>
              )}
            />
          </FormControl>
        </DialogContent>

        <DialogActions className={styles.actions}>
          <Button
            className={`${styles.button} ${styles.cancelButton}`}
            onClick={onClose}
          >
            {t("action_btn.cancel")}
          </Button>
          <Button
            className={`${styles.button} ${styles.submitButton}`}
            type="submit"
            variant="contained"
          >
            {t("action_btn.export")}
          </Button>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}
