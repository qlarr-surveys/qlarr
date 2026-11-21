import { QlarrLogicBuilderInlineWrapper } from "~/components/design/setup/logic/QlarrLogicBuilder";
import { changeRelevance, clearRelevanceConfig, updateInstruction } from "~/state/design/designState";
import React, { useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./Relevance.module.css";
import { Trans, useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import {
  SetupToggle,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";
import ManualExpression from "~/components/design/setup/logic/ManualExpression";

function Relevance({ code, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
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

  const setRelevance = useCallback(
    (next) => {
      dispatch(changeRelevance({ code, key: "relevance", value: { rule: next.rule, logic: next.logic } }));
    },
    [code, dispatch]
  );

  const handleToggle = (checked) => {
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

  // Leaving the expression for the builder starts the builder empty
  const handleBackToBuilder = () => setRelevance({ rule: "show_if", logic: null });

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
          <ManualExpression
            help={manualHelp}
            value={conditionalRelevance?.text || ""}
            onChange={handleRawTextChange}
            placeholder={t("conditional_relevance_text_placeholder")}
            errors={errors.map((err) => err.message)}
            onClose={handleBackToBuilder}
          />
        ) : conditionOn ? (
          <QlarrLogicBuilderInlineWrapper
            code={code}
            jsonLogic={logic}
            onChange={onLogicChange}
            componentIndices={componentIndex}
            designState={designState}
            mainLang={mainLang}
            langList={langList}
            t={tCore}
            includeCopies
            lead={tCore("logic_builder.show_when")}
            onManual={handleSwitchToRaw}
          />
        ) : null)}
    </SetupToggle>
  );
}

export default Relevance;
