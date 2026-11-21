import { ArrowDown } from "lucide-react";
import { ErrorOutlineOutlined } from "@mui/icons-material";
import { QlarrLogicBuilderInlineWrapper } from "~/components/design/setup/logic/QlarrLogicBuilder";
import ManualExpression from "~/components/design/setup/logic/ManualExpression";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { jumpDestinations } from "@qlarr/design-core";
import { isGroup, stripTags } from "~/utils/design/utils";
import {
  addSkipRule,
  updateSkipRule,
  removeSkipRule,
} from "~/state/design/designState";
import { isManualSkipRule } from "@qlarr/design-core/state/addInstructions";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Trans, useTranslation } from "react-i18next";
import {
  SetupAddButton,
  SetupConfirm,
  SetupRemoveButton,
  SetupSelect,
  SetupSwitch,
  SetupToggle,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";
import styles from "./SkipLogic.module.css";

const cx = (...names) => names.filter(Boolean).join(" ");

// Single choice rules start from "this question includes …", like the old
// answer picker; every other rule starts from a blank condition.
const PREFILL_TYPES = ["scq", "image_scq", "icon_scq"];

/**
 * Skip logic, drawn to docs/design/editor-phase-3.3.html (Logic tab): a
 * switch, Add skip rule, and a card per rule: its condition, "then", where it
 * skips to, and what happens on arrival.
 *
 * Rules have no stored on/off of their own, so the switch is on while there
 * are rules, or once the author turns it on to add the first. Turning it off
 * removes the rules, so with any rule set up it asks first.
 */
function SkipLogic({ code, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
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

  // The END group, the only destination that can disqualify
  const endGroupCode = designState.Survey?.children?.find(
    (child) => designState[child.code]?.groupType === "END"
  )?.code;
  // Skipping to the last group already ends the survey
  const surveyGroups = designState.Survey?.children || [];
  const lastGroupCode = surveyGroups[surveyGroups.length - 1]?.code;

  const destinationGroups = useMemo(
    () =>
      groupDestinations({
        destinations,
        code,
        designState,
        componentIndex,
        endGroupCode,
        mainLang,
        t,
      }),
    [destinations, code, designState, componentIndex, endGroupCode, mainLang, t]
  );

  const [open, setOpen] = useState(skipLogic.length > 0);
  const [askingOff, setAskingOff] = useState(false);
  const [focusRule, setFocusRule] = useState(null);
  const on = open || skipLogic.length > 0;
  const switchId = useId();

  // The confirm goes away under the keyboard either way; carry on at the switch
  const focusSwitch = () => document.getElementById(switchId)?.focus();

  const removeAll = () => {
    for (let index = skipLogic.length - 1; index >= 0; index -= 1) {
      dispatch(removeSkipRule({ code, ruleIndex: index }));
    }
  };

  const onToggle = (checked) => {
    if (checked) {
      setOpen(true);
      return;
    }
    const setUp = skipLogic.some(
      (rule) =>
        rule.skipTo ||
        rule.logic ||
        (isManualSkipRule(rule) && rule.text.trim())
    );
    if (setUp) {
      setAskingOff(true);
      return;
    }
    removeAll();
    setOpen(false);
  };

  const turnOff = () => {
    removeAll();
    setAskingOff(false);
    setOpen(false);
    focusSwitch();
  };

  const keepOn = () => {
    setAskingOff(false);
    focusSwitch();
  };

  const addRule = () => {
    setFocusRule(skipLogic.length);
    dispatch(addSkipRule({ code }));
  };

  // A removed rule takes the focus with it; carry on at "Add skip rule"
  const addId = useId();
  const ruleKeys = useRuleKeys(skipLogic.length);
  const removeRule = (ruleIndex) => {
    ruleKeys.current.splice(ruleIndex, 1);
    dispatch(removeSkipRule({ code, ruleIndex }));
    document.getElementById(addId)?.focus();
  };

  // === RENDER ===
  return (
    <SetupToggle
      label={t("skip_logic")}
      help={help("skip_logic")}
      checked={on}
      onChange={onToggle}
      switchId={switchId}
    >
      {askingOff || on ? (
        <div className={styles.body}>
          {askingOff && (
            <SetupConfirm
              message={t("skip_off_confirm")}
              confirmLabel={t("skip_off_action")}
              onCancel={keepOn}
              onConfirm={turnOff}
            />
          )}

          <SetupAddButton id={addId} onClick={addRule}>
            {t("add_skip_rule")}
          </SetupAddButton>

          {skipLogic.length === 0 ? (
            <p className={styles.empty}>
              {t(isGroup(code) ? "skip_empty_page" : "skip_empty_question")}
            </p>
          ) : (
            <ol aria-label={t("skip_rules")} className={styles.rules}>
              {skipLogic.map((rule, ruleIndex) => (
                <SkipRule
                  key={ruleKeys.current[ruleIndex]}
                  code={code}
                  prefill={PREFILL_TYPES.includes(component.type)}
                  rule={rule}
                  ruleIndex={ruleIndex}
                  focusOnMount={focusRule === ruleIndex}
                  onRemove={() => removeRule(ruleIndex)}
                  instruction={component.instructionList?.find(
                    (el) => el.code === "skip_to_auto" + (ruleIndex + 1)
                  )}
                  destinationGroups={destinationGroups}
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
            </ol>
          )}
        </div>
      ) : null}
    </SetupToggle>
  );
}

/**
 * Stored rules have no ids, so each card gets a key of its own: removing a
 * rule then drops its card, instead of handing it (and an unfinished
 * condition in it) to the rule after. Rules come and go at the end, apart
 * from a removal, which splices its key out first.
 */
function useRuleKeys(count) {
  const keys = useRef([]);
  const next = useRef(0);
  while (keys.current.length < count) keys.current.push(next.current++);
  if (keys.current.length > count) keys.current.length = count;
  return keys;
}

/**
 * The "Skip to" list in groups, as the prototype draws it: the rest of this
 * page, then each later page (its start, then its questions), and the end
 * page as "Finish → End survey".
 */
function groupDestinations({
  destinations,
  code,
  designState,
  componentIndex,
  endGroupCode,
  mainLang,
  t,
}) {
  const parentOf = new Map((componentIndex || []).map((e) => [e.code, e.parent]));
  const pageOf = (target) => {
    let current = target;
    while (current && !isGroup(current)) current = parentOf.get(current);
    return current;
  };
  const numberOf = (target) => designState.index?.[target] || target;
  const titleOf = (target) =>
    stripTags(designState[target]?.content?.[mainLang]?.label || "").trim();
  // A code and a title each run in their own direction, so in the Arabic
  // editor "Q3." keeps its dot after it and an English title its "?" at its
  // end. An option can't hold a <bdi>, so each sits between FSI and PDI.
  const isolate = (text) => `⁨${text}⁩`;
  const pageName = (page) => {
    const title = titleOf(page);
    return title ? `${numberOf(page)} · ${isolate(title)}` : numberOf(page);
  };
  const questionName = (question) => {
    const title = titleOf(question);
    return title
      ? `${isolate(`${numberOf(question)}.`)} ${isolate(title)}`
      : numberOf(question);
  };
  const ownPage = isGroup(code) ? null : pageOf(code);

  const groups = [];
  destinations.forEach((destination) => {
    const page = isGroup(destination.code)
      ? destination.code
      : pageOf(destination.code);
    let group = groups[groups.length - 1];
    if (!group || group.page !== page) {
      group = {
        page,
        label:
          page === endGroupCode
            ? t("skip_group_finish")
            : page === ownPage
              ? t("skip_group_this_page", { page: numberOf(page) })
              : pageName(page),
        items: [],
      };
      groups.push(group);
    }
    group.items.push({
      code: destination.code,
      label: !isGroup(destination.code)
        ? questionName(destination.code)
        : destination.code === endGroupCode
          ? t("skip_end_survey")
          : t("skip_start_of_page", { page: numberOf(destination.code) }),
    });
  });
  return groups;
}

function SkipRule({
  code,
  prefill,
  rule,
  ruleIndex,
  focusOnMount,
  onRemove,
  instruction,
  destinationGroups,
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
  const ruleRef = useRef(null);
  const idBase = useId();
  const n = ruleIndex + 1;

  useEffect(() => {
    // A rule just added takes the focus, so the keyboard carries on in it
    if (focusOnMount) ruleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isManual = isManualSkipRule(rule);
  const errors = instruction?.errors || [];
  const invalidSkipDestination =
    rule.skipTo && errors.some((el) => el.name === "InvalidSkipReference");
  const conditionErrors = errors.filter(
    (el) => el.name !== "InvalidSkipReference"
  );
  const visualError = conditionErrors.length > 0 && !isManual;

  const hasCondition = isManual ? !!rule.text.trim() : !!rule.logic;
  const complete = hasCondition && !!rule.skipTo && errors.length === 0;
  const status = complete ? t("skip_rule_complete") : t("skip_rule_incomplete");
  const todo = !hasCondition
    ? t("skip_needs_condition")
    : !rule.skipTo
      ? t("skip_needs_destination")
      : null;

  const destinationId = `${idBase}-to`;
  const destinationHintId = `${idBase}-to-hint`;

  const update = (updates) =>
    dispatch(updateSkipRule({ code, ruleIndex, updates }));

  const onLogicChange = ({ jsonLogic, isEmpty }) => {
    const logic = isEmpty ? null : jsonLogic;
    if (JSON.stringify(logic) !== JSON.stringify(rule.logic ?? null)) {
      update({ logic });
    }
  };

  // Keep the compiled condition as a starting point, like Show when does
  const toManual = () => update({ text: instruction?.text || "", logic: undefined });
  const toBuilder = () => update({ text: undefined, logic: null });

  const manualHelp = [help("skip_manual_expression"), help("expression_reference")]
    .filter(Boolean)
    .join("\n\n");

  // What happens on arrival only means something for a page: "To page end"
  // for any page but the last, "Disqualify" for the end page. One left on
  // from an earlier destination still shows, so it can be turned off.
  const toPage = !!rule.skipTo && isGroup(rule.skipTo);
  const showToEnd =
    toPage &&
    ((rule.skipTo !== endGroupCode && rule.skipTo !== lastGroupCode) ||
      !!rule.toEnd);
  const showDisqualify =
    toPage && (rule.skipTo === endGroupCode || !!rule.disqualify);

  return (
    <li
      ref={ruleRef}
      tabIndex={-1}
      aria-label={t("skip_rule_aria", { n, status })}
      className={cx(
        styles.rule,
        !complete && styles.ruleIncomplete,
        errors.length > 0 && styles.ruleInvalid
      )}
    >
      <div className={styles.ruleHead}>
        <span className={styles.ruleName}>{t("skip_rule_n", { n })}</span>
        <span
          className={cx(styles.status, complete ? styles.statusDone : styles.statusTodo)}
        >
          <span aria-hidden="true">{complete ? "✓" : "!"}</span>
          {status}
        </span>
        <span className={styles.spacer} />
        <SetupRemoveButton label={t("remove_skip_rule_n", { n })} onClick={onRemove} />
      </div>

      <div className={styles.ruleBody}>
        <span className={styles.fieldLabel}>{t("select_conditions")}</span>
        {visualError ? (
          <div className={styles.errorDisplay} role="alert">
            <ErrorOutlineOutlined className={styles.errorIcon} />
            <span className={styles.errorText}>
              <Trans t={t} i18nKey="wrong_skip_logic_err" />
            </span>
            <button
              type="button"
              onClick={() => update({ logic: null })}
              className={setupFieldStyles.secondaryButton}
            >
              {t("ok")}
            </button>
          </div>
        ) : isManual ? (
          <ManualExpression
            help={manualHelp}
            value={rule.text}
            onChange={(text) => update({ text })}
            placeholder={t("skip_condition_text_placeholder")}
            errors={conditionErrors.map((err) => err.message)}
            onClose={toBuilder}
          />
        ) : (
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
            lead={t("skip_when")}
            emptyState={false}
            onManual={toManual}
            firstRule={
              prefill
                ? { field: code, operator: "select_any_in", autoOpen: true }
                : undefined
            }
          />
        )}

        <div aria-hidden="true" className={styles.then}>
          <ArrowDown size={18} strokeWidth={2} />
          <span>{t("skip_then")}</span>
        </div>

        {invalidSkipDestination ? (
          <div className={styles.errorDisplay} role="alert">
            <ErrorOutlineOutlined className={styles.errorIcon} />
            <span className={styles.errorText}>
              <Trans
                t={t}
                i18nKey="invalid_skip_destination_err"
                values={{ code: rule.skipTo }}
              />
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
            <label htmlFor={destinationId} className={styles.fieldLabel}>
              {t("skip_to")}
            </label>
            <SetupSelect
              id={destinationId}
              value={rule.skipTo || ""}
              onChange={(e) => update({ skipTo: e.target.value || null })}
              aria-describedby={destinationHintId}
              aria-invalid={!rule.skipTo}
              className={cx(!rule.skipTo && styles.destinationMissing)}
            >
              <option value="" disabled>
                {t("skip_to_placeholder")}
              </option>
              {destinationGroups.map((group) => (
                <optgroup key={group.page || group.label} label={group.label}>
                  {group.items.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </SetupSelect>
            <p id={destinationHintId} className={styles.destinationHint}>
              {t("skip_to_hint")}
            </p>
          </>
        )}

        {todo && (
          <p role="status" className={styles.todo}>
            <span aria-hidden="true">!</span>
            {todo}
          </p>
        )}
      </div>

      {(showToEnd || showDisqualify) && (
        <div
          role="group"
          aria-label={t("skip_arrival_options", { n })}
          className={styles.endOptions}
        >
          {showToEnd && (
            <EndOption
              label={t("to_group_end")}
              description={t("to_group_end_desc")}
              checked={!!rule.toEnd}
              onChange={(checked) => update({ toEnd: checked })}
            />
          )}
          {showDisqualify && (
            <EndOption
              label={t("disqualify")}
              description={t("disqualify_desc")}
              checked={!!rule.disqualify}
              onChange={(checked) => update({ disqualify: checked })}
            />
          )}
        </div>
      )}
    </li>
  );
}

/** A switch with its name and a line on what it does. */
function EndOption({ label, description, checked, onChange }) {
  const id = useId();
  return (
    <div className={styles.option}>
      <label htmlFor={id} className={styles.optionText}>
        <span id={`${id}-name`} className={styles.optionName}>
          {label}
        </span>
        <span id={`${id}-description`} className={styles.optionDescription}>
          {description}
        </span>
      </label>
      <SetupSwitch
        id={id}
        checked={checked}
        onChange={onChange}
        aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-description`}
      />
    </div>
  );
}

export default SkipLogic;
