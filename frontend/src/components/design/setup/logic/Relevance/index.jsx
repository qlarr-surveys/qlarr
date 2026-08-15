import { Switch, Button, Divider, Typography, TextField, Box, Link } from "@mui/material";
import { QlarrLogicBuilderInlineWrapper } from "~/components/design/setup/logic/QlarrLogicBuilder";
import { changeRelevance, clearRelevanceConfig, updateInstruction } from "~/state/design/designState";
import React, { useMemo, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./Relevance.module.css";
import { Trans, useTranslation } from "react-i18next";
import CustomTooltip from "~/components/common/Tooltip/Tooltip";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";

function Relevance({ code, t }) {
  const dispatch = useDispatch();
  const { t: tTooltips } = useTranslation(NAMESPACES.DESIGN_TOOLTIPS);
  const { t: tCore } = useTranslation(NAMESPACES.DESIGN_CORE);

  const designState = useSelector((s) => s.designState);
  const state = designState[code];
  const componentIndex = designState.componentIndex;
  const langInfo = designState.langInfo;
  const mainLang = langInfo?.mainLang;
  const langList = useMemo(
    () => langInfo?.languagesList?.map((lang) => lang.code) || [],
    [langInfo?.languagesList]
  );

  const rule = state?.relevance?.rule ?? "show_always";
  const logic = state?.relevance?.logic;
  const isDisabled = rule === "hide_always";

  const conditionalRelevance = state?.instructionList?.find(
    (i) => i.code === "conditional_relevance"
  );
  const errors = conditionalRelevance?.errors || [];
  const hasErrors = errors.length > 0;

  // visual mode = structured relevance config exists; raw mode = instruction exists without config
  const isRawMode = !state?.relevance && !!conditionalRelevance;
  const conditionOn = rule === "show_if";
  const isToggleOn = conditionOn || isRawMode;

  const [showResetWarning, setShowResetWarning] = useState(false);

  const setRelevance = useCallback(
    (next) => {
      dispatch(changeRelevance({ code, key: "relevance", value: { rule: next.rule, logic: next.logic } }));
    },
    [code, dispatch]
  );

  const handleToggle = (checked) => {
    setShowResetWarning(false);
    if (checked) {
      setRelevance({ rule: "show_if", logic: logic || null });
    } else if (isRawMode) {
      dispatch(updateInstruction({ code, instruction: { code: "conditional_relevance", remove: true } }));
    } else {
      setRelevance({ rule: "show_always", logic: undefined });
    }
  };

  const onLogicChange = useCallback(
    ({ jsonLogic, isEmpty }) =>
      isEmpty
        ? setRelevance({ rule: "show_always", logic: undefined })
        : setRelevance({ rule: "show_if", logic: jsonLogic }),
    [setRelevance]
  );

  const resetToShowAlways = () => setRelevance({ rule: "show_always", logic: undefined });

  const handleSwitchToRaw = () => {
    if (!conditionalRelevance) {
      dispatch(updateInstruction({
        code,
        instruction: { code: "conditional_relevance", isActive: true, returnType: "boolean", text: "" },
      }));
    }
    dispatch(clearRelevanceConfig({ code }));
  };

  const handleSwitchToVisual = () => setShowResetWarning(true);

  const handleConfirmSwitchToVisual = () => {
    setShowResetWarning(false);
    setRelevance({ rule: "show_if", logic: null });
  };

  const handleRawTextChange = (newText) => {
    dispatch(updateInstruction({
      code,
      instruction: {
        ...(conditionalRelevance || { code: "conditional_relevance", isActive: true, returnType: "boolean" }),
        text: newText,
      },
    }));
  };

  return (
    <div>
      <div className={styles.toggleValue}>
        <div className={styles.label}>
          <CustomTooltip body={tTooltips("relevance")} />
          <Typography color={isDisabled && "text.disabled"} fontWeight={700}>
            {t("relevance")}
          </Typography>
        </div>
        <Switch
          id="conditional-visibility-switch"
          disabled={isDisabled || (hasErrors && !isRawMode)}
          checked={isToggleOn}
          onChange={(e) => handleToggle(e.target.checked)}
          inputProps={{ "aria-label": "conditional-visibility-switch" }}
        />
      </div>

      {isToggleOn && (
        hasErrors && !isRawMode ? (
          <div className={styles.errorContainer}>
            <span className={styles.errorText}>
              <Trans t={t} i18nKey="wrong_logic_err" />
            </span>
            <Button variant="contained" size="small" onClick={resetToShowAlways}>
              {tCore("ok")}
            </Button>
          </div>
        ) : isRawMode ? (
          <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: "4px", mb: 0.5 }}>
              <CustomTooltip body={`${tTooltips("relevance_manual_expression")}\n\n${tTooltips("expression_reference")}`} />
              <Typography variant="body2" fontWeight={600}>{t("manual_expression")}</Typography>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              size="small"
              placeholder={t("conditional_relevance_text_placeholder")}
              value={conditionalRelevance?.text || ""}
              onChange={(e) => handleRawTextChange(e.target.value)}
              error={hasErrors}
            />
            {errors.map((err, i) => (
              <Typography key={i} variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                {err.message}
              </Typography>
            ))}
            {showResetWarning ? (
              <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                  {t("switch_to_visual_warning")}
                </Typography>
                <Button size="small" onClick={() => setShowResetWarning(false)}>
                  {tCore("cancel")}
                </Button>
                <Button size="small" variant="contained" onClick={handleConfirmSwitchToVisual}>
                  {t("confirm_switch")}
                </Button>
              </Box>
            ) : (
              <Box sx={{ mt: 0.5, textAlign: "right" }}>
                <Link
                  component="button"
                  variant="caption"
                  onClick={handleSwitchToVisual}
                  sx={{ cursor: "pointer" }}
                >
                  {t("use_visual_builder")}
                </Link>
              </Box>
            )}
          </>
        ) : conditionOn ? (
          <>
            <Divider sx={{ my: 1 }} />
            <QlarrLogicBuilderInlineWrapper
              code={code}
              jsonLogic={logic}
              onChange={onLogicChange}
              componentIndices={componentIndex}
              designState={designState}
              mainLang={mainLang}
              langList={langList}
              t={tCore}
            />
            <Box sx={{ mt: 0.5, textAlign: "right" }}>
              <Link
                component="button"
                variant="caption"
                onClick={handleSwitchToRaw}
                sx={{ cursor: "pointer" }}
              >
                {t("use_manual_expression")}
              </Link>
            </Box>
          </>
        ) : null
      )}
    </div>
  );
}

export default Relevance;
