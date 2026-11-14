import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useService } from "~/hooks/use-service";
import FormProvider, { RHFTextField } from "~/components/hook-form";
import ConfirmActionModal from "~/components/common/ConfirmActionModal";
import LoadingDots from "~/components/common/LoadingDots";
import CalculationValue from "~/components/manage/CalculationValue";
import { FailuresBanner, FailuresDialog } from "~/components/manage/JobFailures";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import { hasJobAtStake, isActive } from "~/utils/computeJobs";
import ExpressionHelp from "./ExpressionHelp";

const CALC_COMPUTE = "calc.compute";
const MAX_CALCULATIONS = 10;
const MAX_EXPRESSION_LENGTH = 500;
const POLL_INTERVAL_MS = 2000;

/**
 * A calculation's internal code: the key its values are stored under. Authors
 * never see it; it's set once when the calculation is added and kept after,
 * so editing a calculation doesn't orphan its computed values. Fits the
 * engine's rule (a lowercase letter, then lowercase letters, digits and _).
 */
const newCalculationCode = () =>
  `c${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;

const schema = Yup.object().shape({
  calculations: Yup.array().of(
    Yup.object().shape({
      label: Yup.string().required("calculations.label_required"),
      expression: Yup.string().required("calculations.expression_required"),
    })
  ),
});

/** Form values from the stored set; `errors` ride along so they follow their card. */
const toFormValues = (calculations) => ({
  calculations: calculations.map(({ code, label, expression, errors }) => ({
    code,
    label,
    expression,
    errors: errors ?? [],
  })),
});

const isOutOfDate = ({ errors }) =>
  (errors ?? []).some((e) => e.name === "OutOfDate");

/** One cell of the Test sample: invalid, error, value or no value. */
function sampleCell(calculation, row) {
  if ((calculation.errors ?? []).length > 0) return { state: "invalid" };
  const error = row.errors[calculation.code];
  if (error) return { state: "error", message: `${error.name}: ${error.message}` };
  if (calculation.code in row.results) {
    return { state: "value", value: row.results[calculation.code] };
  }
  return { state: "empty" };
}


/**
 * The Calculated fields tab: author a survey's calculations, save them
 * (validated server-side, stored with their errors), test the saved set on the
 * latest responses, and start or cancel the Compute job. A Save deletes the
 * results and cancels a Compute in progress.
 */
function CalculationsSurvey({ onDirtyChange }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const surveyService = useService("survey");
  const { surveyId } = useParams();

  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [sample, setSample] = useState(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(null); // "save" | "test" | "compute" | "cancel" | "retry"
  const [helpOpen, setHelpOpen] = useState(false);
  const [failuresOpen, setFailuresOpen] = useState(false);
  const [computeDone, setComputeDone] = useState(false);
  // The form values of a first save, held until the author confirms the warning.
  const [firstSave, setFirstSave] = useState(null);
  // The form values of a save that would cancel a job or delete results,
  // held until the author confirms.
  const [invalidatingSave, setInvalidatingSave] = useState(null);
  // Status seen last, so the success notice shows only for a job that
  // finishes while the tab is open, not on first load.
  const prevStatus = useRef(null);

  const methods = useForm({
    resolver: yupResolver(schema),
    defaultValues: { calculations: [] },
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "calculations",
  });

  const active = isActive(state?.status);
  const savedEmpty = (state?.calculations.length ?? 0) === 0;
  // Only a Save clears it, so it has to be possible without any edits.
  const outOfDate = state?.calculations.some(isOutOfDate) ?? false;

  /** Take a fresh server state; reset the editor unless it holds unsaved edits. */
  const applyState = useCallback(
    (next, { resetForm }) => {
      setState(next);
      if (resetForm) reset(toFormValues(next.calculations));
    },
    [reset]
  );

  const load = useCallback(
    (resetForm) =>
      surveyService
        .getCalculations(surveyId)
        .then((next) => {
          applyState(next, { resetForm });
          setLoadError(null);
        })
        .catch(() =>
          setLoadError(t("calculations.error_loading", "Failed to load calculations"))
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [surveyId, applyState]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  // Poll while a job is waiting or running.
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => load(false), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active, load]);

  // Notify when a job finishes with every response computed (a cancelled job
  // leaves some uncomputed).
  useEffect(() => {
    const status = state?.status;
    if (!status) return;
    if (
      status === "none" &&
      isActive(prevStatus.current) &&
      state.uncomputedCount === 0
    ) {
      setComputeDone(true);
    }
    prevStatus.current = status;
  }, [state]);

  // Report unsaved edits (the tab switch asks before leaving), and warn on unload.
  useEffect(() => {
    onDirtyChange?.(isDirty);
    if (!isDirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, onDirtyChange]);

  /**
   * A 409 because a job is already going, or there's nothing left to retry:
   * refresh, which shows the current banner.
   */
  const handleError = (error) => {
    if (
      error?.name === PROCESSED_ERRORS.JOB_ALREADY_ACTIVE.name ||
      error?.name === PROCESSED_ERRORS.NO_FAILURES.name
    ) {
      load(false);
    } else if (error?.name === PROCESSED_ERRORS.CALCULATIONS_CHANGED.name) {
      setConflict(true);
    }
  };

  const save = (values) => {
    setBusy("save");
    setSample(null);
    surveyService
      .saveCalculations(
        surveyId,
        values.calculations.map(({ code, label, expression }) => ({
          code,
          label,
          expression,
        })),
        state.revision
      )
      .then((next) => applyState(next, { resetForm: true }))
      .catch(handleError)
      .finally(() => setBusy(null));
  };

  const onSave = handleSubmit((values) => {
    if (savedEmpty) {
      setFirstSave(values);
      return;
    }
    // Disabled while the jobs are checked, so a double-click can't save twice.
    setBusy("save");
    surveyService
      .getJobs(surveyId)
      .then((jobs) => hasJobAtStake(jobs, CALC_COMPUTE))
      .catch(() => true)
      .then((atStake) => {
        if (!atStake) return save(values);
        setBusy(null);
        setInvalidatingSave(values);
      });
  });

  const onConfirmInvalidatingSave = () => {
    save(invalidatingSave);
    setInvalidatingSave(null);
  };

  const onConfirmFirstSave = () => {
    save(firstSave);
    setFirstSave(null);
  };

  const onTest = () => {
    setBusy("test");
    surveyService
      .testCalculations(surveyId)
      .then((result) => setSample(result.sample))
      .catch(handleError)
      .finally(() => setBusy(null));
  };

  const onCompute = () => {
    setBusy("compute");
    surveyService
      .computeCalculations(surveyId)
      .then((next) => applyState(next, { resetForm: false }))
      .catch(handleError)
      .finally(() => setBusy(null));
  };

  const onCancelCompute = () => {
    setBusy("cancel");
    surveyService
      .cancelJob(surveyId, state.jobId)
      .catch(() => undefined)
      .then(() => load(false))
      .finally(() => setBusy(null));
  };

  const onRetry = () => {
    setBusy("retry");
    surveyService
      .retryJob(surveyId, CALC_COMPUTE, "")
      .then(() => load(false))
      .catch(handleError)
      .finally(() => setBusy(null));
  };

  const onReload = () => {
    setConflict(false);
    setSample(null);
    load(true);
  };

  if (loadError) {
    return (
      <Box sx={{ p: 3, maxWidth: 1240, mx: "auto" }}>
        <Alert severity="error">{loadError}</Alert>
      </Box>
    );
  }
  if (!state) return <LoadingDots fullHeight />;

  const actionsDisabled = busy !== null;

  return (
    <Box sx={{ p: 3, maxWidth: 1240, mx: "auto" }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="flex-end">
          <Button
            size="small"
            startIcon={<HelpOutlineIcon />}
            onClick={() => setHelpOpen(true)}
          >
            {t("calculations.help.open", "How to write expressions")}
          </Button>
        </Stack>
        <ExpressionHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

        <StatusBanner
          state={state}
          onCancel={onCancelCompute}
          cancelling={busy === "cancel"}
          t={t}
        />

        {state.failedCount > 0 && (
          <FailuresBanner
            state={state}
            doneLabel={t("calculations.failures_done", "Computed.")}
            onRetry={onRetry}
            retrying={busy === "retry"}
            retryDisabled={actionsDisabled || active}
            onView={() => setFailuresOpen(true)}
          />
        )}
        {failuresOpen && (
          <FailuresDialog
            onClose={() => setFailuresOpen(false)}
            surveyId={surveyId}
            kind={CALC_COMPUTE}
            subjectKey=""
          />
        )}

        {conflict && (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={onReload}>
                {t("calculations.reload", "Reload")}
              </Button>
            }
          >
            {t(
              "calculations.conflict",
              "Someone else changed the calculations."
            )}
          </Alert>
        )}

        <FormProvider methods={methods} onSubmit={onSave}>
          <Stack spacing={2}>
            {fields.map((field, index) => (
              <CalculationCard
                key={field.id}
                index={index}
                control={control}
                errors={field.errors ?? []}
                onRemove={() => remove(index)}
                t={t}
              />
            ))}

            {fields.length === 0 && (
              <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  {t("calculations.empty", "No calculations yet.")}
                </Typography>
              </Paper>
            )}

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                startIcon={<AddIcon />}
                onClick={() =>
                  append({
                    code: newCalculationCode(),
                    label: "",
                    expression: "",
                    errors: [],
                  })
                }
                disabled={fields.length >= MAX_CALCULATIONS}
              >
                {t("calculations.add", "Add calculation")}
              </Button>
              <Box sx={{ flex: 1 }} />
              <LoadingButton
                type="submit"
                variant="contained"
                loading={busy === "save"}
                disabled={actionsDisabled || (!isDirty && !outOfDate)}
              >
                {t("calculations.save", "Save")}
              </LoadingButton>
              <LoadingButton
                variant="outlined"
                onClick={onTest}
                loading={busy === "test"}
                disabled={actionsDisabled || isDirty || savedEmpty}
              >
                {t("calculations.test", "Test")}
              </LoadingButton>
              <LoadingButton
                variant="outlined"
                onClick={onCompute}
                loading={busy === "compute"}
                disabled={actionsDisabled || active || isDirty || savedEmpty}
              >
                {t("calculations.compute", "Compute")}
              </LoadingButton>
            </Stack>
          </Stack>
        </FormProvider>

        {sample && (
          <SampleTable
            calculations={state.calculations}
            sample={sample}
            t={t}
          />
        )}
      </Stack>

      <ConfirmActionModal
        open={firstSave !== null}
        title={t("calculations.first_save_title", "Good to know")}
        description={t(
          "calculations.design_warning",
          "Calculations need re-validating with every survey design change."
        )}
        cancelLabel={t("action_btn.cancel")}
        confirmLabel={t("calculations.save", "Save")}
        confirmColor="primary"
        onClose={() => setFirstSave(null)}
        onConfirm={onConfirmFirstSave}
      />

      <ConfirmActionModal
        open={invalidatingSave !== null}
        title={t("calculations.save_invalidates_title", "Delete computed results?")}
        description={t(
          "calculations.save_invalidates",
          "Saving cancels the running computation and deletes all computed results."
        )}
        cancelLabel={t("action_btn.cancel")}
        confirmLabel={t("calculations.save", "Save")}
        onClose={() => setInvalidatingSave(null)}
        onConfirm={onConfirmInvalidatingSave}
      />

      <Snackbar
        open={computeDone}
        autoHideDuration={4000}
        onClose={() => setComputeDone(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setComputeDone(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {t("calculations.compute_success", "Computation finished.")}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/** The one banner for the current status. */
function StatusBanner({ state, onCancel, cancelling, t }) {
  const active = isActive(state.status);
  // No saved calculations: Compute is disabled, so don't prompt for it.
  if (state.calculations.length === 0 && !active) return null;
  // Each card asks for a Save first, so don't prompt for Compute yet.
  if (state.status === "none" && state.calculations.some(isOutOfDate)) return null;
  const cancel = (
    <LoadingButton
      color="inherit"
      size="small"
      onClick={onCancel}
      loading={cancelling}
    >
      {t("calculations.cancel_compute", "Cancel")}
    </LoadingButton>
  );
  switch (state.status) {
    case "waiting":
      return (
        <Alert severity="info" action={cancel}>
          {t("calculations.status_waiting", "Waiting to compute…")}
        </Alert>
      );
    case "running":
      return (
        <Alert severity="info" action={cancel}>
          {t("calculations.status_running", "Computing… {{done}}/{{total}}", {
            done: state.progress?.done ?? 0,
            total: state.progress?.total ?? 0,
          })}
        </Alert>
      );
    case "failed":
      if (state.errorCode === "too_many_failures") {
        return (
          <Alert severity="error">
            {t(
              "calculations.status_too_many_failures",
              "Computation stopped: too many responses failed. Results so far are kept."
            )}
          </Alert>
        );
      }
      return state.errorCode === "time_limit" ? (
        <Alert severity="warning">
          {t(
            "calculations.status_time_limit",
            "Computation stopped at its time limit. Results so far are kept. Click Compute to continue."
          )}
        </Alert>
      ) : (
        <Alert severity="error">
          {t(
            "calculations.status_failed",
            "Computation failed. Click Compute to run it again."
          )}
        </Alert>
      );
    default:
      return state.uncomputedCount > 0 ? (
        <Alert severity="info">
          {t(
            "calculations.status_uncomputed",
            "{{count}} responses not computed. Click Compute.",
            { count: state.uncomputedCount }
          )}
        </Alert>
      ) : null;
  }
}

/** One calculation: label, expression, remove, and its stored errors. */
function CalculationCard({ index, control, errors, onRemove, t }) {
  const scriptErrors = errors.filter((e) => e.name === "ScriptError");

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <RHFTextField
            name={`calculations.${index}.label`}
            label={t("calculations.label", "Label")}
            size="small"
          />
          <IconButton
            onClick={onRemove}
            aria-label={t("calculations.remove", "Remove calculation")}
          >
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
        <Controller
          name={`calculations.${index}.expression`}
          control={control}
          render={({ field, fieldState: { error } }) => (
            <TextField
              {...field}
              label={t("calculations.expression", "Expression")}
              multiline
              minRows={2}
              fullWidth
              inputProps={{ maxLength: MAX_EXPRESSION_LENGTH }}
              error={!!error || scriptErrors.length > 0}
              helperText={error ? t(error.message) : undefined}
              sx={{ "& textarea": { fontFamily: "monospace" } }}
            />
          )}
        />
        {scriptErrors.map((e, i) => (
          <ScriptErrorText key={i} error={e} control={control} index={index} t={t} />
        ))}
        {isOutOfDate({ errors }) && (
          <Alert severity="warning">
            {t(
              "calculations.error_OutOfDate",
              "The survey design changed. Review this calculation and click Save."
            )}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

/** A ScriptError: its message, plus the offending part of the stored expression. */
function ScriptErrorText({ error, control, index, t }) {
  return (
    <Controller
      name={`calculations.${index}.expression`}
      control={control}
      render={({ field }) => {
        const part = (field.value ?? "").slice(error.start, error.end);
        return (
          <Box>
            <Typography variant="body2" color="error">
              {t("calculations.error_ScriptError", "Script error")}: {error.message}
            </Typography>
            {part && (
              <Typography
                variant="body2"
                component="code"
                sx={{
                  fontFamily: "monospace",
                  backgroundColor: "error.lighter",
                  color: "error.darker",
                  px: 0.5,
                  borderRadius: 0.5,
                }}
              >
                {part}
              </Typography>
            )}
          </Box>
        );
      }}
    />
  );
}

/** The Test result: one row per sample response, one column per calculation. */
function SampleTable({ calculations, sample, t }) {
  if (sample.length === 0) {
    return (
      <Alert severity="info">
        {t("calculations.sample_empty", "No completed responses to test on yet.")}
      </Alert>
    );
  }
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t("calculations.sample_response", "Response")}</TableCell>
            {calculations.map((c, i) => (
              <TableCell key={i}>{c.label || c.code}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sample.map((row) => (
            <TableRow key={row.responseId}>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{row.index != null ? `#${row.index}` : "—"}</span>
                  {row.preview && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontWeight={500}
                    >
                      {t("responses.test_response")}
                    </Typography>
                  )}
                </Stack>
              </TableCell>
              {calculations.map((c, i) => (
                <TableCell key={i}>
                  <CalculationValue {...sampleCell(c, row)} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default React.memo(CalculationsSurvey);
