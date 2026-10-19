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
  Chip,
  IconButton,
  Paper,
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
import LoadingDots from "~/components/common/LoadingDots";
import CalculationValue from "~/components/manage/CalculationValue";
import { ALLOWED_CODE_CHARS_REGEX } from "~/utils/design/codeUtils";
import { PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import ExpressionHelp from "./ExpressionHelp";

const MAX_CALCULATIONS = 10;
const MAX_EXPRESSION_LENGTH = 500;
const POLL_INTERVAL_MS = 2000;

const schema = Yup.object().shape({
  calculations: Yup.array().of(
    Yup.object().shape({
      code: Yup.string().required("calculations.code_required"),
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
 * latest responses, and start the background Compute run.
 */
function CalculationsSurvey({ onDirtyChange }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const surveyService = useService("survey");
  const { surveyId } = useParams();

  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [sample, setSample] = useState(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(null); // "save" | "test" | "compute"
  const [helpOpen, setHelpOpen] = useState(false);

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

  const running = state?.status === "running";
  const savedEmpty = (state?.calculations.length ?? 0) === 0;

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

  // Poll while a run is in progress.
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => load(false), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [running, load]);

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

  /** A 409 because a run is going: refresh, which shows the running banner. */
  const handleError = (error) => {
    if (error?.name === PROCESSED_ERRORS.CALCULATION_RUN_IN_PROGRESS.name) {
      load(false);
    } else if (error?.name === PROCESSED_ERRORS.CALCULATIONS_CHANGED.name) {
      setConflict(true);
    }
  };

  const onSave = handleSubmit((values) => {
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
  });

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

  const actionsDisabled = running || busy !== null;

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

        <StatusBanner state={state} t={t} />

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
                disabled={running}
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
                  append({ code: "", label: "", expression: "", errors: [] })
                }
                disabled={running || fields.length >= MAX_CALCULATIONS}
              >
                {t("calculations.add", "Add calculation")}
              </Button>
              <Box sx={{ flex: 1 }} />
              <LoadingButton
                type="submit"
                variant="contained"
                loading={busy === "save"}
                disabled={actionsDisabled || !isDirty}
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
                disabled={actionsDisabled || isDirty || savedEmpty}
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
    </Box>
  );
}

/** The one banner for the current status. */
function StatusBanner({ state, t }) {
  switch (state.status) {
    case "idle":
      return (
        <Alert severity="info">
          {t("calculations.status_idle", "Not computed. Click Compute.")}
        </Alert>
      );
    case "running":
      return (
        <Alert severity="info">
          {t("calculations.status_running", "Computing… {{done}}/{{total}}", {
            done: state.progress.done,
            total: state.progress.total,
          })}
        </Alert>
      );
    case "failed":
      return (
        <Alert severity="error">
          {t(
            "calculations.status_failed",
            "Computation failed. Click Compute to run it again."
          )}
        </Alert>
      );
    case "completed":
      return state.newSinceLastRun > 0 ? (
        <Alert severity="warning">
          {t(
            "calculations.status_new_responses",
            "{{count}} responses submitted since the last computation. Click Compute to include them.",
            { count: state.newSinceLastRun }
          )}
        </Alert>
      ) : null;
    default:
      return null;
  }
}

/** One calculation: code, label, expression, remove, and its stored errors. */
function CalculationCard({ index, control, errors, disabled, onRemove, t }) {
  const codeErrors = errors.filter(
    (e) => e.name === "InvalidCode" || e.name === "DuplicateCode"
  );
  const scriptErrors = errors.filter((e) => e.name === "ScriptError");

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Controller
            name={`calculations.${index}.code`}
            control={control}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label={t("calculations.code", "Code")}
                size="small"
                disabled={disabled}
                onChange={(event) =>
                  field.onChange(
                    event.target.value
                      .toLowerCase()
                      .replace(ALLOWED_CODE_CHARS_REGEX, "")
                  )
                }
                error={!!error || codeErrors.length > 0}
                helperText={
                  error
                    ? t(error.message)
                    : codeErrors
                        .map((e) => t(`calculations.error_${e.name}`))
                        .join(" ")
                }
                sx={{ width: 220 }}
              />
            )}
          />
          <RHFTextField
            name={`calculations.${index}.label`}
            label={t("calculations.label", "Label")}
            size="small"
            disabled={disabled}
          />
          <IconButton
            onClick={onRemove}
            disabled={disabled}
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
              disabled={disabled}
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
                    <Chip size="small" label={t("responses.preview", "Preview")} />
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
