// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect, beforeEach } from "vitest";
import {
  buildDesignState,
  addQuota,
  updateQuota,
  removeQuota,
  changeContent,
  deleteQuestion,
  convertQuestion,
  refreshDsl,
} from "../state/mutations";
import { quotaMessageKey } from "../constants/design";
import { brokenQuotaCodes } from "../state/addInstructions";
import sample from "./fixtures/sample-survey.json";

const QUESTION = "Q298jbb";
const condition = { logic: { "==": [{ var: QUESTION }, "yes"] } };

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
    const CHOICE = "Q867ezm";
    const stale = { in: [{ var: CHOICE }, ["A1"]] };
    const [first, second] = addQuotas(2);
    updateQuota(state, { code: first, changes: { condition: { logic: stale } } });
    deleteQuestion(state, CHOICE);

    expect(() =>
      updateQuota(state, { code: second, changes: { condition } }),
    ).not.toThrow();
    expect(() => removeQuota(state, second)).not.toThrow();
    expect(quotaCodes(state)).toEqual([first]);
    expect(state.Survey.quotas[0].condition.logic).toEqual(stale);
  });

  it("keeps another message's images when one message key prefixes it", () => {
    const image = (name) => `<p><img data-resource-name="${name}"></p>`;
    const key1 = quotaMessageKey("QT1");
    const key10 = quotaMessageKey("QT10");
    changeContent(state, { code: "Survey", key: key10, lang: "en", value: image("ten.png") });
    changeContent(state, { code: "Survey", key: key1, lang: "en", value: image("one.png") });
    changeContent(state, { code: "Survey", key: key1, lang: "en", value: "<p>No image</p>" });

    expect(state.Survey.resources).toEqual({ [`content_en_${key10}_1`]: "ten.png" });
  });

  it("keeps an unchanged quota instruction, with its errors, when another quota changes", () => {
    const [first, second] = addQuotas(2);
    updateQuota(state, { code: first, changes: { condition } });
    const firstInstruction = quotaInstructions(state)[0];
    firstInstruction.errors = ["SOME_ERROR"];

    updateQuota(state, { code: second, changes: { condition } });

    const kept = quotaInstructions(state).find((i) => i.code === `quota_${first}`);
    expect(kept).toBe(firstInstruction);
    expect(kept.errors).toEqual(["SOME_ERROR"]);
  });

  it("reports quotas whose compiled condition has errors as broken", () => {
    const [first, second] = addQuotas(2);
    updateQuota(state, { code: first, changes: { condition } });
    updateQuota(state, { code: second, changes: { condition } });
    quotaInstructions(state).find((i) => i.code === `quota_${first}`).errors = ["SOME_ERROR"];

    expect(brokenQuotaCodes(state.Survey)).toEqual(new Set([first]));
  });

  it("recompiles quota conditions when their question changes type", () => {
    const CHOICE = "Q867ezm";
    const [code] = addQuotas(1);
    updateQuota(state, {
      code,
      changes: { condition: { logic: { in: [{ var: CHOICE }, ["A1"]] } } },
    });
    expect(quotaInstructions(state)[0].text).not.toContain("filter");

    convertQuestion(state, { questionCode: CHOICE, newType: "mcq" });

    expect(quotaInstructions(state)[0].text).toContain("filter");
  });

  it("restores quota instructions on refreshDsl", () => {
    const [code] = addQuotas(1);
    updateQuota(state, { code, changes: { condition } });
    const compiled = quotaInstructions(state)[0].text;
    quotaInstructions(state)[0].text = "stale";

    refreshDsl(state);

    expect(quotaInstructions(state)[0].text).toBe(compiled);
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
