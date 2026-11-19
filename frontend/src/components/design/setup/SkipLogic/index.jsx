import { AddOutlined, ErrorOutlineOutlined } from "@mui/icons-material";
import { Button } from "@mui/material";
import { QlarrLogicBuilderInlineWrapper } from "~/components/design/setup/logic/QlarrLogicBuilder";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { jumpDestinations } from "~/utils/design/access/jumpDestinations";
import {
  addSkipRule,
  updateSkipRule,
  removeSkipRule,
} from "~/state/design/designState";
import { isManualSkipRule } from "@qlarr/design-core/state/addInstructions";
import React, { useId, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Trans, useTranslation } from "react-i18next";
import {
  SetupAddButton,
  SetupCard,
  SetupHint,
  SetupLabel,
  SetupRemoveButton,
  SetupSelect,
  SetupSubField,
  SetupSubToggle,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";
import styles from "./SkipLogic.module.css";

const cx = (...names) => names.filter(Boolean).join(" ");

// Single choice rules start from "this question includes …", like the old
// answer picker; every other rule starts from a blank condition.
const PREFILL_TYPES = ["scq", "image_scq", "icon_scq"];

function SkipLogic({ code, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const idBase = useId();
  const { t: tCore } = useTranslation(NAMESPACES.DESIGN_CORE);

  // === SELECTORS ===
  const designState = useSelector((state) => state.designState);
  const componentIndex = designState.componentIndex;
  const mainLang = designState.langInfo.mainLang;
  const languagesList = designState.langInfo.languagesList;
  const langList = useMemo(
    () => languagesList?.map((lang) => lang.code) || [],
    [languagesList]
  );
  const component = designState[code];
  const skipLogic = Array.isArray(component.skip_logic)
    ? component.skip_logic
    : [];

  const destinations = useMemo(() => {
    return jumpDestinations(componentIndex, code, designState, mainLang);
  }, [componentIndex, code, designState, mainLang]);

  // Find the END group code for disqualify validation
  const endGroupCode = designState.Survey?.children?.find(
    (child) => designState[child.code]?.groupType === "END"
  )?.code;

  const groups = destinations.filter((el) => el.code.startsWith("G"));
  const lastGroupCode =
    groups.length >= 2 ? groups[groups.length - 1].code : undefined;

  // === RENDER ===
  return (
    <div role="group" aria-labelledby={`${idBase}-title`}>
      <div className={setupFieldStyles.head}>
        <SetupLabel
          id={`${idBase}-title`}
          label={t("skip_logic")}
          help={help("skip_logic")}
        />
      </div>

      <div className={setupFieldStyles.stack}>
        {skipLogic.map((rule, ruleIndex) => (
          <SkipRule
            key={ruleIndex}
            idBase={`${idBase}-${ruleIndex}`}
            code={code}
            prefill={PREFILL_TYPES.includes(component.type)}
            rule={rule}
            ruleIndex={ruleIndex}
            instruction={component.instructionList?.find(
              (el) => el.code === "skip_to_auto" + (ruleIndex + 1)
            )}
            destinations={destinations}
            endGroupCode={endGroupCode}
            lastGroupCode={lastGroupCode}
            componentIndex={componentIndex}
            designState={designState}
            mainLang={mainLang}
            langList={langList}
            help={help}
            t={t}
            tCore={tCore}
          />
        ))}

        <SetupAddButton onClick={() => dispatch(addSkipRule({ code }))}>
          {t("add_skip_rule")}
        </SetupAddButton>
      </div>
    </div>
  );
}

function SkipRule({
  idBase,
  code,
  prefill,
  rule,
  ruleIndex,
  instruction,
  destinations,
  endGroupCode,
  lastGroupCode,
  componentIndex,
  designState,
  mainLang,
  langList,
  help,
  t,
  tCore,
}) {
  const dispatch = useDispatch();
  // "idle" shows the Add condition button; its first click prefills a
  // condition on this question ("prefilled"). After that ("advanced") an
  // empty rule offers both a blank condition ("blank") and a manual expression.
  // Rules that can't prefill start out advanced.
  const [stage, setStage] = useState(prefill ? "idle" : "advanced");
  const [showResetWarning, setShowResetWarning] = useState(false);

  const isManual = isManualSkipRule(rule);
  const showBuilder =
    !isManual && (stage === "prefilled" || stage === "blank" || !!rule.logic);
  const errors = instruction?.errors || [];
  const invalidSkipDestination =
    rule.skipTo && errors.some((el) => el.name === "InvalidSkipReference");
  const conditionErrors = errors.filter(
    (el) => el.name !== "InvalidSkipReference"
  );
  const visualError = conditionErrors.length > 0 && !isManual;

  const titleId = `${idBase}-title`;
  const expressionId = `${idBase}-expression`;
  const destinationId = `${idBase}-to`;

  const update = (updates) =>
    dispatch(updateSkipRule({ code, ruleIndex, updates }));

  const onLogicChange = ({ jsonLogic, isEmpty }) => {
    if (isEmpty) setStage("advanced");
    const logic = isEmpty ? null : jsonLogic;
    if (JSON.stringify(logic) !== JSON.stringify(rule.logic ?? null)) {
      update({ logic });
    }
  };

  const resetCondition = () => {
    setStage("advanced");
    update({ logic: null });
  };

  // Keep the compiled condition as a starting point, like show/hide does
  const onSwitchToManual = () => {
    setStage("advanced");
    update({ text: instruction?.text || "", logic: undefined });
  };

  const onConfirmSwitchToVisual = () => {
    setShowResetWarning(false);
    setStage("advanced");
    update({ text: undefined, logic: null });
  };

  const manualHelp = [help("skip_manual_expression"), help("expression_reference")]
    .filter(Boolean)
    .join("\n\n");

  // Skipping to the last group already ends the survey
  const toEndDisabled = rule.skipTo === lastGroupCode;
  // Disqualify is only allowed when skipping to END group
  const disqualifyDisabled = rule.skipTo !== endGroupCode;

  return (
    <SetupCard
      aria-labelledby={titleId}
      invalid={!!invalidSkipDestination || conditionErrors.length > 0}
      title={<span id={titleId}>{t("select_conditions")}</span>}
      actions={
        <SetupRemoveButton
          label={t("remove_rule")}
          onClick={() => dispatch(removeSkipRule({ code, ruleIndex }))}
        />
      }
    >
      {visualError ? (
        <div className={styles.errorDisplay} role="alert">
          <ErrorOutlineOutlined className={styles.errorIcon} />
          <span className={styles.errorText}>
            <Trans t={t} i18nKey="wrong_skip_logic_err" />
          </span>
          <button
            type="button"
            onClick={resetCondition}
            className={setupFieldStyles.secondaryButton}
          >
            {t("ok")}
          </button>
        </div>
      ) : isManual ? (
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
            placeholder={t("skip_condition_text_placeholder")}
            value={rule.text}
            onChange={(e) => update({ text: e.target.value })}
            aria-invalid={conditionErrors.length > 0}
            className={cx(
              setupFieldStyles.textarea,
              setupFieldStyles.code,
              conditionErrors.length > 0 && setupFieldStyles.invalid
            )}
          />
          {conditionErrors.map((err, i) => (
            <SetupHint key={i} error>
              {err.message}
            </SetupHint>
          ))}
          {showResetWarning ? (
            <div
              className={styles.confirm}
              role="alertdialog"
              aria-label={t("switch_to_visual_warning")}
            >
              <p className={styles.confirmText}>
                {t("switch_to_visual_warning")}
              </p>
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
                  onClick={onConfirmSwitchToVisual}
                  className={styles.confirmButton}
                >
                  {t("confirm_switch")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowResetWarning(true)}
              className={setupFieldStyles.textLink}
            >
              {t("use_visual_builder")}
            </button>
          )}
        </div>
      ) : showBuilder ? (
        <QlarrLogicBuilderInlineWrapper
          code={code}
          jsonLogic={rule.logic}
          onChange={onLogicChange}
          componentIndices={componentIndex}
          designState={designState}
          mainLang={mainLang}
          langList={langList}
          t={tCore}
          includeSelf
          initialRule={
            stage === "prefilled"
              ? { field: code, operator: "select_any_in", autoOpen: true }
              : stage === "blank"
                ? {}
                : undefined
          }
          moreActions={
            <button
              type="button"
              onClick={onSwitchToManual}
              className={cx(setupFieldStyles.textLink, styles.inlineLink)}
            >
              {t("use_manual_expression")}
            </button>
          }
        />
      ) : (
        <div className={styles.conditionActions}>
          {/* Same small button the builder adds conditions with */}
          <Button
            variant="text"
            size="small"
            startIcon={<AddOutlined />}
            onClick={() => setStage(stage === "idle" ? "prefilled" : "blank")}
          >
            {tCore("logic_builder.add_condition")}
          </Button>
          {stage === "advanced" && (
            <button
              type="button"
              onClick={onSwitchToManual}
              className={cx(setupFieldStyles.textLink, styles.inlineLink)}
            >
              {t("use_manual_expression")}
            </button>
          )}
        </div>
      )}

      {invalidSkipDestination ? (
        <div className={styles.errorDisplay} role="alert">
          <ErrorOutlineOutlined className={styles.errorIcon} />
          <span className={styles.errorText}>
            {t("invalid_skip_destination_err", { code: rule.skipTo })}
          </span>
          <button
            type="button"
            onClick={() => update({ skipTo: null })}
            className={setupFieldStyles.secondaryButton}
          >
            {t("ok")}
          </button>
        </div>
      ) : (
        <>
          <SetupSubField label={t("skip_to")} htmlFor={destinationId}>
            <SetupSelect
              id={destinationId}
              value={rule.skipTo || ""}
              onChange={(e) => update({ skipTo: e.target.value || null })}
            >
              <option value="">{t("skip_destination_placeholder")}</option>
              {destinations?.map((element) => (
                <option key={element.code} value={element.code}>
                  {element.label}
                </option>
              ))}
            </SetupSelect>
          </SetupSubField>

          {rule.skipTo?.startsWith("G") && (
            <div className={styles.endOptions}>
              <SetupSubToggle
                label={t("to_group_end")}
                checked={rule.toEnd || false}
                disabled={toEndDisabled}
                onChange={(checked) => update({ toEnd: checked })}
              />
              <SetupSubToggle
                label={t("disqualify")}
                checked={rule.disqualify || false}
                disabled={disqualifyDisabled}
                onChange={(checked) => update({ disqualify: checked })}
              />
            </div>
          )}
        </>
      )}
    </SetupCard>
  );
}

export default SkipLogic;
