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
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { saveAs } from "file-saver";
import FormProvider from "~/components/hook-form";
import { useParams } from "react-router-dom";
import { useService } from "~/hooks/use-service";

export default function ResponsesDownload({
  open,
  onClose,
  t,
  currentFrom = 1,
  currentTo = 1,
}) {
  const { surveyId } = useParams();
  const surveyService = useService("survey");

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const handleSnackbarClose = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  const min = 1;

  const VerifySchema = yup.object().shape({
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
  });

  const methods = useForm({
    mode: "onChange",
    resolver: yupResolver(VerifySchema),
    defaultValues: {
      from: currentFrom,
      to: currentTo,
      filter: "all",
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
        });
      }
    }, [open, currentFrom, currentTo, reset]);

  const onSubmit = handleSubmit((data) => {
    if (!surveyId) {
      return;
    }

    const from = Number(data.from);
    const to = Number(data.to);
    const complete =
      data.filter === "all" ? null : data.filter === "complete" ? true : false;

    setLoading(true);
    surveyService
      .downloadResponseFiles(surveyId, from, to, complete)
      .then((blob) => {
        console.log("here!!!")
        if (!blob || blob.size === 0) {
          setSnackbar({
            open: true,
            message: t("responses.no_files_found"),
            severity: "warning",
          });
          return;
        }
        if (blob) {
          const suffix =
            data.filter === "all"
              ? "all"
              : data.filter === "complete"
              ? "complete"
              : "incomplete";
          const fileName = `${surveyId}-responses_${from}-${to}_${suffix}.zip`;
          const file = new File([blob], fileName, { type: "application/zip" });
          saveAs(file);
        }
        onClose?.();
      })
      .catch((error) => {
        console.log(error)
        if (error?.name === "size_limit_exceeded") {
          setSnackbar({
            open: true,
            message: t("processed_errors.size_limit_exceeded"),
            severity: "error",
          });
        }
      })
      .finally(() => {
        setLoading(false);
      });
  });

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t("responses.download")}</DialogTitle>

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
            </FormControl>
          </DialogContent>

          <DialogActions>
            <Button onClick={onClose} disabled={loading}>
              {t("action_btn.cancel")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              endIcon={
                loading ? <CircularProgress size={20} color="inherit" /> : null
              }
            >
              {t("action_btn.download")}
            </Button>
          </DialogActions>
        </FormProvider>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
