import React, { useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  MenuItem,
  Select,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { accessibleDependencies, isArrayType } from "@qlarr/design-core";
import { stripTags } from "~/utils/design/utils";
import {
  enableCarryForward,
  updateCarryForward,
  disableCarryForward,
} from "~/state/design/designState";

// A source for carry forward must be an earlier multiple-choice question.
const SOURCE_TYPES = ["mcq", "icon_mcq", "image_mcq"];

// Config editor for one axis of a target ("rows" for choice/ranking/text
// targets; "rows" and "columns" for arrays). Dispatches the design-core carry
// forward mutations, which materialize + keep the options in sync.
function AxisConfig({ code, axis, axisLabel, sources, hasOtherFor, t }) {
  const dispatch = useDispatch();
  const config = useSelector((s) => s.designState[code]?.carryForward?.[axis]);
  const sourceCode = config?.sourceCode || "";
  const mode = config?.mode || "selected";
  const carryOther = !!config?.carryOther;
  const sourceHasOther = sourceCode ? hasOtherFor(sourceCode) : false;

  const onSource = (e) => {
    const value = e.target.value;
    if (!value) {
      dispatch(disableCarryForward({ targetCode: code, axis }));
    } else if (config) {
      dispatch(updateCarryForward({ targetCode: code, axis, sourceCode: value }));
    } else {
      dispatch(
        enableCarryForward({
          targetCode: code,
          sourceCode: value,
          axis,
          mode: "selected",
          carryOther: false,
        }),
      );
    }
  };

  const onMode = (_e, value) => {
    if (value) dispatch(updateCarryForward({ targetCode: code, axis, mode: value }));
  };

  const onCarryOther = (e) =>
    dispatch(
      updateCarryForward({ targetCode: code, axis, carryOther: e.target.checked }),
    );

  return (
    <Box sx={{ mb: 1 }}>
      {axisLabel && (
        <Typography fontWeight={700} variant="body2" sx={{ mb: 0.5 }}>
          {axisLabel}
        </Typography>
      )}
      <Select
        fullWidth
        size="small"
        displayEmpty
        value={sourceCode}
        onChange={onSource}
      >
        <MenuItem value="">
          <em>{t("carry_source_placeholder")}</em>
        </MenuItem>
        {sources.map((s) => (
          <MenuItem key={s.code} value={s.code}>
            {s.label}
          </MenuItem>
        ))}
      </Select>

      {config && (
        <Box sx={{ mt: 1 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={onMode}
            aria-label="carry-forward-mode"
          >
            <ToggleButton value="selected">
              {t("carry_mode_selected")}
            </ToggleButton>
            <ToggleButton value="unselected">
              {t("carry_mode_unselected")}
            </ToggleButton>
          </ToggleButtonGroup>

          {mode === "selected" && sourceHasOther && (
            <FormControlLabel
              sx={{ display: "block", mt: 0.5 }}
              control={
                <Switch
                  size="small"
                  checked={carryOther}
                  onChange={onCarryOther}
                />
              }
              label={t("carry_other")}
            />
          )}

          <Button
            size="small"
            color="error"
            sx={{ mt: 0.5 }}
            onClick={() =>
              dispatch(disableCarryForward({ targetCode: code, axis }))
            }
          >
            {t("carry_remove")}
          </Button>
        </Box>
      )}
    </Box>
  );
}

function CarryForward({ code, t }) {
  const designState = useSelector((s) => s.designState);
  const state = designState[code];
  const isArray = isArrayType(state?.type);
  const index = designState.index || {};
  const mainLang = designState.langInfo?.mainLang;

  const sources = useMemo(() => {
    const deps = accessibleDependencies(designState.componentIndex, code) || [];
    return deps
      .filter((dep) => SOURCE_TYPES.includes(designState[dep]?.type))
      .map((dep) => ({
        code: dep,
        label: `${index[dep] || ""}. ${stripTags(
          designState[dep]?.content?.[mainLang]?.label || "",
        )}`,
      }));
  }, [designState, code, index, mainLang]);

  const hasOtherFor = useCallback(
    (src) =>
      (designState[src]?.children || []).some(
        (c) => designState[c.qualifiedCode]?.type === "other",
      ),
    [designState],
  );

  // No eligible source → the rule is filtered out of the setup panel upstream
  // (SetupPanel), so this is just a defensive guard.
  if (!sources.length) {
    return null;
  }

  return (
    <div>
      {isArray ? (
        <>
          <AxisConfig
            code={code}
            axis="rows"
            axisLabel={t("carry_from_rows")}
            sources={sources}
            hasOtherFor={hasOtherFor}
            t={t}
          />
          <Divider sx={{ my: 1.5 }} />
          <AxisConfig
            code={code}
            axis="columns"
            axisLabel={t("carry_from_columns")}
            sources={sources}
            hasOtherFor={hasOtherFor}
            t={t}
          />
        </>
      ) : (
        <AxisConfig
          code={code}
          axis="rows"
          axisLabel={t("carry_from")}
          sources={sources}
          hasOtherFor={hasOtherFor}
          t={t}
        />
      )}
    </div>
  );
}

export default CarryForward;
