import { QlarrLogicBuilderInlineWrapper } from "~/components/design/setup/logic/QlarrLogicBuilder";
import { changeRelevance, clearRelevanceConfig, updateInstruction } from "~/state/design/designState";
import React, { useMemo, useCallback, useId, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./Relevance.module.css";
import { Trans, useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
  SetupHint,
  SetupLabel,
  SetupToggle,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

const cx = (...names) => names.filter(Boolean).join(" ");

function Relevance({ code, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const { t: tCore } = useTranslation(NAMESPACES.DESIGN_CORE);
  const expressionId = useId();

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

  const manualHelp = [
    help("relevance_manual_expression"),
    help("expression_reference"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <SetupToggle
      label={t("relevance")}
      help={help("relevance")}
      checked={isToggleOn}
      onChange={handleToggle}
      disabled={isDisabled || (hasErrors && !isRawMode)}
    >
      {isToggleOn &&
        (hasErrors && !isRawMode ? (
          <div className={styles.errorContainer} role="alert">
            <span className={styles.errorText}>
              <Trans t={t} i18nKey="wrong_logic_err" />
            </span>
            <button
              type="button"
              onClick={resetToShowAlways}
              className={setupFieldStyles.secondaryButton}
            >
              {tCore("ok")}
            </button>
          </div>
        ) : isRawMode ? (
          <div className={setupFieldStyles.stack}>
            <SetupLabel
              label={t("manual_expression")}
              help={manualHelp}
              htmlFor={expressionId}
              field
            />
            <textarea
              id={expressionId}
              rows={3}
              dir="ltr"
              spellCheck={false}
              placeholder={t("conditional_relevance_text_placeholder")}
              value={conditionalRelevance?.text || ""}
              onChange={(e) => handleRawTextChange(e.target.value)}
              aria-invalid={hasErrors}
              className={cx(
                setupFieldStyles.textarea,
                setupFieldStyles.code,
                hasErrors && setupFieldStyles.invalid
              )}
            />
            {errors.map((err, i) => (
              <SetupHint key={i} error>
                {err.message}
              </SetupHint>
            ))}
            {showResetWarning ? (
              <div className={styles.confirm} role="alertdialog" aria-label={t("switch_to_visual_warning")}>
                <p className={styles.confirmText}>{t("switch_to_visual_warning")}</p>
                <div className={styles.confirmActions}>
                  <button
                    type="button"
                    onClick={() => setShowResetWarning(false)}
                    className={setupFieldStyles.secondaryButton}
                  >
                    {tCore("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSwitchToVisual}
                    className={styles.confirmButton}
                  >
                    {t("confirm_switch")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSwitchToVisual}
                className={setupFieldStyles.textLink}
              >
                {t("use_visual_builder")}
              </button>
            )}
          </div>
        ) : conditionOn ? (
          <div className={setupFieldStyles.stack}>
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
            <button
              type="button"
              onClick={handleSwitchToRaw}
              className={setupFieldStyles.textLink}
            >
              {t("use_manual_expression")}
            </button>
          </div>
        ) : null)}
    </SetupToggle>
  );
}

export default Relevance;
