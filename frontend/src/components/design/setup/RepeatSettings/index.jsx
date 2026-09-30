import React, { useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  FormControlLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  accessibleDependencies,
  CARRY_FORWARD_SOURCE_TYPES,
  REPEAT_NUMBER_MAX,
} from "@qlarr/design-core";
import { stripTags } from "~/utils/design/utils";
import {
  enableRepetition,
  updateRepetitionSource,
  disableRepetition,
} from "~/state/design/designState";

// Source types selectable per repetition kind.
const MCQ_SOURCE_TYPES = CARRY_FORWARD_SOURCE_TYPES; // per selected option
const NUMBER_SOURCE_TYPES = ["number"]; // per entered count

// Visual, carry-forward-style authoring for repetition. The author toggles the
// component repeatable and picks a source; design-core derives `repeatInfo`
// (range + relevanceInstruction) — the raw values are never edited here.
function RepeatSettings({ code, t }) {
  const dispatch = useDispatch();
  const designState = useSelector((s) => s.designState);
  const config = useSelector((s) => s.designState[code]?.repeatSource);
  const repeatInfo = useSelector((s) => s.designState[code]?.repeatInfo);

  const enabled = !!config;
  const kind = config?.kind || "mcq";
  const sourceCode = config?.sourceCode || "";
  const max = config?.max ?? REPEAT_NUMBER_MAX;
  const carryOther = !!config?.carryOther;

  const index = designState.index || {};
  const mainLang = designState.langInfo?.mainLang;

  const labelFor = useCallback(
    (dep) =>
      `${index[dep] || ""}. ${stripTags(
        designState[dep]?.content?.[mainLang]?.label || "",
      )}`,
    [designState, index, mainLang],
  );

  const eligibleTypes = kind === "number" ? NUMBER_SOURCE_TYPES : MCQ_SOURCE_TYPES;

  const sources = useMemo(() => {
    const deps = accessibleDependencies(designState.componentIndex, code) || [];
    return deps
      .filter((dep) => eligibleTypes.includes(designState[dep]?.type))
      .map((dep) => ({ code: dep, label: labelFor(dep) }));
  }, [designState, code, eligibleTypes, labelFor]);

  const sourceHasOther = useMemo(
    () =>
      (designState[sourceCode]?.children || []).some(
        (c) => designState[c.qualifiedCode]?.type === "other",
      ),
    [designState, sourceCode],
  );

  const onToggle = (e) => {
    if (e.target.checked) {
      dispatch(enableRepetition({ code }));
    } else {
      dispatch(disableRepetition({ code }));
    }
  };

  // Switching kind invalidates the current source (valid types differ).
  const onKind = (_e, value) => {
    if (value && value !== kind) {
      dispatch(updateRepetitionSource({ code, kind: value, sourceCode: "" }));
    }
  };

  const onSource = (e) =>
    dispatch(updateRepetitionSource({ code, sourceCode: e.target.value }));

  const onMax = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!Number.isNaN(value)) {
      dispatch(updateRepetitionSource({ code, max: value }));
    }
  };

  const onCarryOther = (e) =>
    dispatch(updateRepetitionSource({ code, carryOther: e.target.checked }));

  return (
    <Box>
      <FormControlLabel
        control={<Switch size="small" checked={enabled} onChange={onToggle} />}
        label={t("repeat_enable")}
      />

      {enabled && (
        <Box sx={{ mt: 1 }}>
          <Typography fontWeight={700} variant="body2" sx={{ mb: 0.5 }}>
            {t("repeat_kind")}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={kind}
            onChange={onKind}
            aria-label="repeat-kind"
          >
            <ToggleButton value="mcq">{t("repeat_kind_option")}</ToggleButton>
            <ToggleButton value="number">{t("repeat_kind_count")}</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ mt: 1 }}>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={sources.some((s) => s.code === sourceCode) ? sourceCode : ""}
              onChange={onSource}
            >
              <MenuItem value="">
                <em>{t("repeat_source_placeholder")}</em>
              </MenuItem>
              {sources.map((s) => (
                <MenuItem key={s.code} value={s.code}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {kind === "number" && sourceCode && (
            <TextField
              type="number"
              size="small"
              sx={{ mt: 1, width: 140 }}
              label={t("repeat_max")}
              value={max}
              onChange={onMax}
              inputProps={{ min: 1, max: REPEAT_NUMBER_MAX }}
            />
          )}

          {kind === "mcq" && sourceCode && sourceHasOther && (
            <FormControlLabel
              sx={{ display: "block", mt: 0.5 }}
              control={
                <Switch
                  size="small"
                  checked={carryOther}
                  onChange={onCarryOther}
                />
              }
              label={t("repeat_include_other")}
            />
          )}

          {repeatInfo?.range?.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              {kind === "number"
                ? t("repeat_summary_count", { count: repeatInfo.range.length })
                : t("repeat_summary_option", { count: repeatInfo.range.length })}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default RepeatSettings;
