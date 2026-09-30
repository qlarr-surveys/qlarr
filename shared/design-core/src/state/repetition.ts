// @ts-nocheck — loose JS-origin logic; internals stay untyped, public API typed at index.ts
// Repetition authoring core.
//
// A group or question can be marked *repeatable* from visual settings (the same
// carry-forward pattern): the author picks a SOURCE question, and this module
// DERIVES the engine wire format `repeatInfo = { type, range, relevanceInstruction }`.
// The author never edits `range`/`relevanceInstruction` directly.
//
// Two source kinds:
//   - "mcq":    repeat once per selected option. range = the source option codes
//               with their "A" answer-prefix stripped (A1..A7 -> "1".."7").
//   - "number": repeat once per count. range = "1".."max" (max capped at 12).
//
// `repeatSource` (visual config) is persisted for the builder; `repeatInfo` is
// regenerated from it and is pure derived state — a change to a source question's
// options must rebuild every repeatable that sources it (resyncRepeatablesForSource).

import { isGroup, isQuestion } from "../utils/pureUtils";
import { CARRY_FORWARD_SOURCE_TYPES } from "../constants/design";
import { removeInstruction } from "./addInstructions";

export const REPEAT_TOKEN_PLACEHOLDER = "$repeat_token";
export const REPEAT_NUMBER_MAX = 12;

// Source option types that never spawn a copy (mirror carry forward). "other" is
// opt-in via `carryOther`, exactly like carry forward.
const NON_REPEATED_OPTION_TYPES = ["all", "none", "other_text"];

// The question code that owns a code, e.g. "Q1A2" -> "Q1", "Q1" -> "Q1".
const questionCodeOf = (code) => (String(code).match(/Q[a-z0-9_]+/) || [code])[0];

// Option code -> repeat token: strip the leading "A" answer prefix ("A1" -> "1",
// "Aother" -> "other"). The remainder is [a-z0-9_]+, which satisfies the engine's
// token rule ^[a-z0-9_]+$. The "A" is re-added in the generated expression.
const optionToken = (optionCode) => optionCode.replace(/^A/, "");

// Regular (repeatable) source options in source order: excludes All / None /
// other_text; "Other" is appended only when carryOther is set.
const repeatableSourceOptions = (state, sourceCode, carryOther) =>
  (state[sourceCode]?.children || []).filter((c) => {
    const t = state[c.qualifiedCode]?.type;
    if (NON_REPEATED_OPTION_TYPES.indexOf(t) > -1) return false;
    if (t === "other") return !!carryOther;
    return true;
  });

// A missing/blank max means "use the cap" (matches the RepeatSettings default),
// not 1. An explicit value is clamped to [1, cap].
const clampMax = (max) => {
  if (max == null || max === "") return REPEAT_NUMBER_MAX;
  const n = Math.floor(Number(max));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, REPEAT_NUMBER_MAX);
};

// Pure: derive the engine `repeatInfo` wire object from a visual `repeatSource`.
// Returns null when the config can't yet produce a repeatable (no kind, no source,
// or a source of the wrong type) — the caller then drops `repeatInfo` entirely.
export const buildRepeatInfo = (state, repeatSource) => {
  if (!repeatSource || !repeatSource.kind) return null;
  const { kind, sourceCode } = repeatSource;
  if (!sourceCode || !state[sourceCode]) return null;
  const sourceType = state[sourceCode].type;

  if (kind === "mcq") {
    if (CARRY_FORWARD_SOURCE_TYPES.indexOf(sourceType) === -1) return null;
    const range = repeatableSourceOptions(
      state,
      sourceCode,
      repeatSource.carryOther,
    ).map((c) => optionToken(c.code));
    return {
      type: "repeatable",
      range,
      relevanceInstruction: `(${sourceCode}.value || []).indexOf('A${REPEAT_TOKEN_PLACEHOLDER}') > -1`,
    };
  }

  if (kind === "number") {
    if (sourceType !== "number") return null;
    const max = clampMax(repeatSource.max);
    const range = Array.from({ length: max }, (_, i) => String(i + 1));
    return {
      type: "repeatable",
      range,
      // unquoted token -> numeric comparison: copy k shows iff value >= k
      relevanceInstruction: `${sourceCode}.value >= ${REPEAT_TOKEN_PLACEHOLDER}`,
    };
  }

  return null;
};

// Recompute state[code].repeatInfo from state[code].repeatSource. Idempotent.
export const applyRepeatInfo = (state, code) => {
  const target = state[code];
  if (!target) return;
  const info = buildRepeatInfo(state, target.repeatSource);
  if (info) {
    target.repeatInfo = info;
  } else {
    delete target.repeatInfo;
  }
};

// `range` is derived, so any change to a source question's options (add / remove /
// reorder / recode) must rebuild every repeatable that sources it.
export const resyncRepeatablesForSource = (state, changedCode) => {
  if (!changedCode) return;
  const sourceQuestion = questionCodeOf(changedCode);
  Object.keys(state).forEach((key) => {
    const comp = state[key];
    if (
      comp &&
      typeof comp === "object" &&
      comp.repeatSource?.sourceCode === sourceQuestion
    ) {
      applyRepeatInfo(state, key);
    }
  });
};

// The engine expands a `repeatable` template into concrete `repeated` copies
// (`G1_apple`, `Q1_apple`, ...) in the validated survey. The builder must never
// see or edit those — they are transient runtime artifacts. Strip every copy root
// (`repeatInfo.type === "repeated"`) and its whole subtree from the flat design
// state and drop the dangling child refs. `componentIndexList` is left as-is
// (copies stay there; the closed-scope reference rule excludes them anyway).
// Only the copy ROOT carries `repeatInfo.type === "repeated"`; its descendants
// keep the template's own repeatInfo (usually none), so copies are found by root
// and removed by subtree walk.
export const stripRepeatedCopies = (state) => {
  const deleted = new Set();
  const collect = (key) => {
    const comp = state[key];
    if (!comp || deleted.has(key)) return;
    deleted.add(key);
    (comp.children || []).forEach((child) => {
      // groups/questions are keyed by `code`; answers by `qualifiedCode`.
      const childKey = state[child.code] ? child.code : child.qualifiedCode;
      if (childKey) collect(childKey);
    });
  };
  Object.keys(state).forEach((key) => {
    if (state[key] && state[key].repeatInfo?.type === "repeated") collect(key);
  });
  if (deleted.size === 0) return;

  deleted.forEach((key) => delete state[key]);
  Object.keys(state).forEach((key) => {
    const comp = state[key];
    if (comp && Array.isArray(comp.children)) {
      comp.children = comp.children.filter(
        (c) => !deleted.has(c.code) && !deleted.has(c.qualifiedCode),
      );
    }
  });
};

// Defensive full rebuild — run on ingestion so a persisted `repeatSource` always
// yields a current `repeatInfo` (covers source edits that happened out of band,
// e.g. a source recode on a prior session).
export const resyncAllRepeatables = (state) => {
  Object.keys(state).forEach((key) => {
    const comp = state[key];
    if (comp && typeof comp === "object" && comp.repeatSource) {
      applyRepeatInfo(state, key);
    }
  });
};

// The survey tree is shallow (Survey > group > question > answer, no group
// nesting) and only groups/questions can be repeatable — so a component's only
// possible repeatable ancestor is its immediate parent. No walk needed.
const parentCodeOf = (designState, code) =>
  designState?.componentIndex?.find((c) => c.code === code)?.parent;

// This component is itself marked repeatable.
export const isRepeatable = (designState, code) =>
  !!designState?.[code]?.repeatSource;

// A parent is repeatable — i.e. marking this one repeatable would nest it.
export const hasRepeatableAncestor = (designState, code) =>
  isRepeatable(designState, parentCodeOf(designState, code));

// This component is a repeatable, or sits directly inside one (self-inclusive).
export const isInsideRepeatable = (designState, code) =>
  isRepeatable(designState, code) || hasRepeatableAncestor(designState, code);

// --- mutations: fn(state, payload) mutate in place, Redux-agnostic ---

// Toggle repetition ON. Groups and questions only (never answers). Idempotent:
// re-enabling keeps an existing config. Optional initial fields may be supplied.
export function enableRepetition(state, payload) {
  const { code } = payload;
  const target = state[code];
  if (!target || !(isGroup(code) || isQuestion(code))) return;
  if (!target.repeatSource) {
    target.repeatSource = { kind: payload.kind === "number" ? "number" : "mcq" };
    if (payload.sourceCode) target.repeatSource.sourceCode = payload.sourceCode;
    if (payload.max !== undefined) target.repeatSource.max = clampMax(payload.max);
    if (payload.carryOther !== undefined)
      target.repeatSource.carryOther = !!payload.carryOther;
  }
  // A repeatable's show-logic IS its repeat condition — a separate conditional
  // relevance is REPEATABLE_WITH_RELEVANCE. Strip any existing one (visual config
  // + instruction) so marking a component repeatable never lands in that error.
  delete target.relevance;
  if (target.instructionList) removeInstruction(target, "conditional_relevance");
  applyRepeatInfo(state, code);
}

// Edit the visual config and regenerate. No-op if repetition isn't enabled.
export function updateRepetitionSource(state, payload) {
  const { code } = payload;
  const target = state[code];
  if (!target || !target.repeatSource) return;
  const rs = target.repeatSource;
  if (payload.kind !== undefined) {
    rs.kind = payload.kind === "number" ? "number" : "mcq";
  }
  if (payload.sourceCode !== undefined) {
    rs.sourceCode = payload.sourceCode || undefined;
  }
  if (payload.max !== undefined) {
    rs.max = clampMax(payload.max);
  }
  if (payload.carryOther !== undefined) {
    rs.carryOther = !!payload.carryOther;
  }
  // Number repetition always carries an explicit max (default = cap) so the input
  // value and the derived range never diverge.
  if (rs.kind === "number" && rs.max == null) {
    rs.max = REPEAT_NUMBER_MAX;
  }
  applyRepeatInfo(state, code);
}

// Toggle repetition OFF. Drops both the visual config and the derived wire field.
export function disableRepetition(state, payload) {
  const { code } = payload;
  const target = state[code];
  if (!target) return;
  delete target.repeatSource;
  delete target.repeatInfo;
}
