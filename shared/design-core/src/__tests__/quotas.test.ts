// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect, beforeEach } from "vitest";
import {
  buildDesignState,
  addQuota,
  updateQuota,
  removeQuota,
  changeContent,
  deleteQuestion,
} from "../state/mutations";
import { quotaMessageKey } from "../constants/design";
import sample from "./fixtures/sample-survey.json";

const QUESTION = "Q298jbb";
const condition = { logic: { "==": [{ var: `${QUESTION}.value` }, "yes"] } };

// Fresh, fully-initialised design state from the fixture (sets langInfo + index).
const freshState = () =>
  buildDesignState(
    {},
    {
      designerInput: {
        state: structuredClone(sample),
        componentIndexList: [],
      },
      versionDto: {},
    },
  );

const quotaCodes = (state) => state.Survey.quotas.map((quota) => quota.code);

const quotaInstructions = (state) =>
  (state.Survey.instructionList || []).filter((instruction) =>
    instruction.code.startsWith("quota_"),
  );

describe("quotas", () => {
  let state;
  beforeEach(() => {
    state = freshState();
  });

  // Adds `count` quotas and returns their generated codes.
  const addQuotas = (count) => {
    for (let i = 0; i < count; i++) addQuota(state);
    return quotaCodes(state);
  };

  it("gives each new quota a random code, like question codes", () => {
    const [code] = addQuotas(1);
    expect(code).toMatch(/^QT\d{3}[a-z]{3}$/);
    expect(state.Survey.quotas[0]).toEqual({
      code,
      label: "",
      limit: 0,
      condition: { logic: null },
    });
  });

  it("never reuses a removed quota's code, even the last one", () => {
    const [first, last] = addQuotas(2);
    removeQuota(state, last);
    const [, added] = addQuotas(1);
    expect(added).not.toBe(last);
    expect(new Set(quotaCodes(state)).size).toBe(2);
    expect(quotaCodes(state)[0]).toBe(first);
  });

  it("compiles a quota's condition into a boolean Survey instruction", () => {
    const [code] = addQuotas(1);
    updateQuota(state, { code, changes: { label: "Men", limit: 5 } });
    expect(state.Survey.quotas[0]).toMatchObject({ label: "Men", limit: 5 });
    expect(quotaInstructions(state)).toEqual([]);

    updateQuota(state, { code, changes: { condition } });
    const [instruction] = quotaInstructions(state);
    expect(instruction).toMatchObject({
      code: `quota_${code}`,
      isActive: true,
      returnType: "boolean",
    });
    expect(instruction.text).toContain(QUESTION);

    updateQuota(state, { code, changes: { condition: { logic: null } } });
    expect(quotaInstructions(state)).toEqual([]);
  });

  it("ignores updates to a quota that does not exist", () => {
    addQuotas(1);
    const before = structuredClone(state.Survey);
    updateQuota(state, { code: "QTmissing", changes: { condition } });
    expect(state.Survey).toEqual(before);
  });

  it("keeps working after a question a quota refers to is deleted", () => {
    const CHOICE = "Q867ezm"; // scq
    const stale = { in: [{ var: `${CHOICE}.value` }, ["A1"]] };
    const [first, second] = addQuotas(2);
    updateQuota(state, { code: first, changes: { condition: { logic: stale } } });
    deleteQuestion(state, CHOICE);

    // Every quota edit recompiles all quota conditions, including the stale one.
    expect(() =>
      updateQuota(state, { code: second, changes: { condition } }),
    ).not.toThrow();
    expect(() => removeQuota(state, second)).not.toThrow();
    // The stale quota keeps its condition (the backend flags it) rather than being dropped.
    expect(quotaCodes(state)).toEqual([first]);
    expect(state.Survey.quotas[0].condition.logic).toEqual(stale);
  });

  it("removes a quota's end message in every language and its instruction", () => {
    const [first, second] = addQuotas(2);
    updateQuota(state, { code: first, changes: { condition } });
    updateQuota(state, { code: second, changes: { condition } });
    const key1 = quotaMessageKey(first);
    const key2 = quotaMessageKey(second);
    changeContent(state, { code: "Survey", key: key1, lang: "en", value: "<p>Full</p>" });
    changeContent(state, { code: "Survey", key: key1, lang: "de", value: "<p>Voll</p>" });
    changeContent(state, { code: "Survey", key: key2, lang: "en", value: "<p>Other</p>" });

    removeQuota(state, first);

    expect(quotaCodes(state)).toEqual([second]);
    expect(state.Survey.content.en[key1]).toBeUndefined();
    expect(state.Survey.content.de[key1]).toBeUndefined();
    expect(state.Survey.content.en[key2]).toBe("<p>Other</p>");
    expect(quotaInstructions(state).map((instruction) => instruction.code)).toEqual([
      `quota_${second}`,
    ]);
  });
});
