import React from "react";
import {
  Alert,
  Box,
  Checkbox,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { previewTarget, valueChange } from "~/state/runState";

// Single-question preview: lets the designer answer the earlier questions the
// previewed one depends on (piped labels, conditional styling, …). Answers go
// straight into the run state, so the question updates live, with no request.
function PreviewInputs() {
  const { t } = useTranslation(NAMESPACES.RUN);
  const inputs = useSelector(
    (state) => state.runState.data?.previewInputs ?? [],
    shallowEqual,
  );

  // The target is always shown in this mode; say so when respondents with
  // these answers wouldn't actually see it.
  const hiddenForRespondents = useSelector((state) => {
    const target = previewTarget(state);
    const group = state.runState.data?.survey?.groups?.find(
      (g) => g.inCurrentNavigation,
    );
    return [target, group?.code].some(
      (code) => code && state.runState.values[code]?.relevance === false,
    );
  });

  if (!inputs.length) return null;

  return (
    <Box
      sx={{
        maxWidth: 720,
        mx: "auto",
        mb: 3,
        p: 2,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        backgroundColor: "background.paper",
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: "text.secondary", letterSpacing: 1 }}
      >
        {t("preview_inputs.title")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        {t("preview_inputs.hint")}
      </Typography>
      <Stack spacing={2}>
        {inputs.map((input) => (
          <PreviewInput key={input.code} input={input} />
        ))}
      </Stack>
      {hiddenForRespondents && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t("preview_inputs.hidden")}
        </Alert>
      )}
    </Box>
  );
}

function PreviewInput({ input }) {
  const { t } = useTranslation(NAMESPACES.RUN);
  const dispatch = useDispatch();
  const value = useSelector(
    (state) => state.runState.values[input.code]?.value,
    shallowEqual,
  );
  const set = (newValue) =>
    dispatch(valueChange({ componentCode: input.code, value: newValue }));

  if (input.kind === "multi") {
    // A dropdown like the single-choice inputs, but with a checkbox per option
    // so it reads as pick-several.
    const selected = Array.isArray(value) ? value : [];
    const labels = Object.fromEntries(
      input.options.map((o) => [o.code, o.label]),
    );
    return (
      <TextField
        select
        size="small"
        fullWidth
        label={input.label}
        value={selected}
        onChange={(e) =>
          // Keep the options' order, as the question itself does.
          set(
            input.options
              .map((o) => o.code)
              .filter((c) => e.target.value.includes(c)),
          )
        }
        SelectProps={{
          multiple: true,
          renderValue: (codes) => codes.map((c) => labels[c]).join(", "),
        }}
      >
        {input.options.map((option) => (
          <MenuItem key={option.code} value={option.code}>
            <Checkbox size="small" checked={selected.includes(option.code)} />
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (input.options) {
    return (
      <TextField
        select
        size="small"
        fullWidth
        label={input.label}
        value={value ?? ""}
        onChange={(e) => set(e.target.value)}
      >
        <MenuItem value="">
          <em>{t("preview_inputs.none")}</em>
        </MenuItem>
        {input.options.map((option) => (
          <MenuItem key={option.code} value={option.code}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  const isNumber = input.kind === "number";
  return (
    <TextField
      size="small"
      fullWidth
      label={input.label}
      type={isNumber ? "number" : "text"}
      value={value ?? ""}
      onChange={(e) =>
        set(isNumber && e.target.value !== "" ? Number(e.target.value) : e.target.value)
      }
    />
  );
}

export default React.memo(PreviewInputs);
