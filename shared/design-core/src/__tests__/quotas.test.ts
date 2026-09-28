// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect, beforeEach } from "vitest";
import {
  buildDesignState,
  addQuota,
  updateQuota,
  removeQuota,
  changeContent,
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

  it("numbers new quotas QT1, QT2… without reusing a removed code", () => {
    addQuota(state);
    addQuota(state);
    addQuota(state);
    expect(quotaCodes(state)).toEqual(["QT1", "QT2", "QT3"]);
    expect(state.Survey.quotas[0]).toEqual({
      code: "QT1",
      label: "",
      limit: 0,
      condition: { logic: null },
    });

    removeQuota(state, "QT2");
    addQuota(state);
    expect(quotaCodes(state)).toEqual(["QT1", "QT3", "QT4"]);
  });

  it("compiles a quota's condition into a boolean Survey instruction", () => {
    addQuota(state);
    updateQuota(state, { code: "QT1", changes: { label: "Men", limit: 5 } });
    expect(state.Survey.quotas[0]).toMatchObject({ label: "Men", limit: 5 });
    expect(quotaInstructions(state)).toEqual([]);

    updateQuota(state, { code: "QT1", changes: { condition } });
    const [instruction] = quotaInstructions(state);
    expect(instruction).toMatchObject({
      code: "quota_QT1",
      isActive: true,
      returnType: "boolean",
    });
    expect(instruction.text).toContain(QUESTION);

    updateQuota(state, { code: "QT1", changes: { condition: { logic: null } } });
    expect(quotaInstructions(state)).toEqual([]);
  });

  it("ignores updates to a quota that does not exist", () => {
    addQuota(state);
    const before = structuredClone(state.Survey);
    updateQuota(state, { code: "QT9", changes: { condition } });
    expect(state.Survey).toEqual(before);
  });

  it("removes a quota's end message in every language and its instruction", () => {
    addQuota(state);
    addQuota(state);
    updateQuota(state, { code: "QT1", changes: { condition } });
    updateQuota(state, { code: "QT2", changes: { condition } });
    const key1 = quotaMessageKey("QT1");
    const key2 = quotaMessageKey("QT2");
    changeContent(state, { code: "Survey", key: key1, lang: "en", value: "<p>Full</p>" });
    changeContent(state, { code: "Survey", key: key1, lang: "de", value: "<p>Voll</p>" });
    changeContent(state, { code: "Survey", key: key2, lang: "en", value: "<p>Other</p>" });

    removeQuota(state, "QT1");

    expect(quotaCodes(state)).toEqual(["QT2"]);
    expect(state.Survey.content.en[key1]).toBeUndefined();
    expect(state.Survey.content.de[key1]).toBeUndefined();
    expect(state.Survey.content.en[key2]).toBe("<p>Other</p>");
    expect(quotaInstructions(state).map((instruction) => instruction.code)).toEqual([
      "quota_QT2",
    ]);
  });
});
