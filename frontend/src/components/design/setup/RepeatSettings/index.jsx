import React, { useMemo, useCallback, useId, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  accessibleDependencies,
  CARRY_FORWARD_SOURCE_TYPES,
  REPEAT_NUMBER_MAX,
  REPEAT_CONSTANT_MIN,
} from "@qlarr/design-core";
import { stripTags } from "~/utils/design/utils";
import {
  enableRepetition,
  updateRepetitionSource,
  disableRepetition,
} from "~/state/design/designState";
import {
  SetupHint,
  SetupSegmented,
  SetupSelect,
  SetupSubField,
  SetupSubToggle,
  SetupToggle,
  setupFieldStyles,
  useSetupHelp,
} from "~/components/design/setup/SetupFields";

// Source types selectable per repetition kind.
const MCQ_SOURCE_TYPES = CARRY_FORWARD_SOURCE_TYPES; // per selected option
const NUMBER_SOURCE_TYPES = ["number"]; // per entered count

const SUMMARY_KEYS = {
  mcq: "repeat_summary_option",
  number: "repeat_summary_count",
  constant: "repeat_summary_constant",
};

// Visual, carry-forward-style authoring for repetition. The author toggles the
// component repeatable and picks a source; design-core derives `repeatInfo`
// (range + relevanceInstruction) — the raw values are never edited here.
function RepeatSettings({ code, t }) {
  const dispatch = useDispatch();
  const help = useSetupHelp();
  const sourceId = useId();
  const maxId = useId();
  const countId = useId();
  const designState = useSelector((s) => s.designState);
  const config = useSelector((s) => s.designState[code]?.repeatSource);
  const repeatInfo = useSelector((s) => s.designState[code]?.repeatInfo);

  const enabled = !!config;
  const kind = config?.kind || "mcq";
  const sourceCode = config?.sourceCode || "";
  const max = config?.max ?? REPEAT_NUMBER_MAX;
  const count = config?.count ?? REPEAT_CONSTANT_MIN;
  const carryOther = !!config?.carryOther;
  // Typed text while the count input is focused; committed (and clamped) on blur,
  // so intermediate keystrokes like the "1" of "10" aren't clamped to the min.
  const [countDraft, setCountDraft] = useState(null);

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

  const onToggle = (checked) => {
    if (checked) {
      // Start on a fixed count when nothing can drive an option/count repeat.
      const deps = accessibleDependencies(designState.componentIndex, code) || [];
      const hasSource = deps.some((dep) =>
        [...MCQ_SOURCE_TYPES, ...NUMBER_SOURCE_TYPES].includes(designState[dep]?.type),
      );
      dispatch(enableRepetition({ code, kind: hasSource ? undefined : "constant" }));
    } else {
      dispatch(disableRepetition({ code }));
    }
  };

  // Switching kind invalidates the current source (valid types differ).
  const onKind = (value) => {
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

  const onCountBlur = () => {
    const value = parseInt(countDraft, 10);
    if (!Number.isNaN(value)) {
      dispatch(updateRepetitionSource({ code, count: value }));
    }
    setCountDraft(null);
  };

  const onCarryOther = (checked) =>
    dispatch(updateRepetitionSource({ code, carryOther: checked }));

  return (
    <SetupToggle
      label={t("repeat_enable")}
      help={help("repetition")}
      checked={enabled}
      onChange={onToggle}
    >
      {enabled && (
        <div className={setupFieldStyles.stack}>
          <SetupSegmented
            label={t("repeat_kind")}
            options={[
              { value: "mcq", label: t("repeat_kind_option") },
              { value: "number", label: t("repeat_kind_count") },
              { value: "constant", label: t("repeat_kind_constant") },
            ]}
            columns={3}
            value={kind}
            onChange={onKind}
          />

          {kind === "constant" && (
            <SetupSubField label={t("repeat_count")} htmlFor={countId}>
              <input
                id={countId}
                type="number"
                min={REPEAT_CONSTANT_MIN}
                max={REPEAT_NUMBER_MAX}
                value={countDraft ?? count}
                onChange={(e) => setCountDraft(e.target.value)}
                onBlur={onCountBlur}
                className={`${setupFieldStyles.input} ${setupFieldStyles.inputShort}`}
              />
            </SetupSubField>
          )}

          {kind !== "constant" && sources.length > 0 && (
            <SetupSelect
              id={sourceId}
              aria-label={t("repeat_source_placeholder")}
              value={
                sources.some((s) => s.code === sourceCode) ? sourceCode : ""
              }
              onChange={onSource}
            >
              <option value="">{t("repeat_source_placeholder")}</option>
              {sources.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </SetupSelect>
          )}

          {kind !== "constant" && !sources.some((s) => s.code === sourceCode) && (
            <SetupHint warning>{t("repeat_no_source")}</SetupHint>
          )}

          {kind === "number" && sourceCode && (
            <SetupSubField label={t("repeat_max")} htmlFor={maxId}>
              <input
                id={maxId}
                type="number"
                min={1}
                max={REPEAT_NUMBER_MAX}
                value={max}
                onChange={onMax}
                className={`${setupFieldStyles.input} ${setupFieldStyles.inputShort}`}
              />
            </SetupSubField>
          )}

          {kind === "mcq" && sourceCode && sourceHasOther && (
            <SetupSubToggle
              label={t("repeat_include_other")}
              checked={carryOther}
              onChange={onCarryOther}
            />
          )}

          {repeatInfo?.range?.length > 0 && (
            <SetupHint>
              {t(SUMMARY_KEYS[kind], { count: repeatInfo.range.length })}
            </SetupHint>
          )}
        </div>
      )}
    </SetupToggle>
  );
}

export default RepeatSettings;
