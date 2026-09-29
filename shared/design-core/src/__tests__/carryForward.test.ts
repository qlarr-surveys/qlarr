// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect, beforeEach } from "vitest";
import {
  buildDesignState,
  enableCarryForward,
  updateCarryForward,
  disableCarryForward,
  changeContent,
  addNewAnswer,
  removeAnswer,
  convertQuestion,
} from "../state/mutations";
import { createQuestion } from "../factory/questionFactory";
import { buildCodeIndex } from "../utils/pureUtils";
import sample from "./fixtures/sample-survey.json";

const SOURCE = "Q835lqi"; // mcq: Aall, A1..A7, Anone, Aother(+Atext)
const ARRAY = "Q976owq"; // scq_array: cols Ac1..Ac3, rows A1..A4 (after the source)

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

// Append an empty choice question to the last content group (after the source).
const addChoiceTarget = (state, type = "mcq", qId = "tgt") => {
  const created = createQuestion(type, qId, "en");
  const code = `Q${qId}`;
  Object.keys(created).forEach((k) => {
    if (k !== "question") state[k] = created[k];
  });
  state.G948ohe.children.push(created.question);
  state.index = buildCodeIndex(state);
  return code;
};

const childCodes = (state, code) =>
  (state[code].children || []).map((c) => c.code);

const instr = (state, qualifiedCode, instrCode) =>
  (state[qualifiedCode].instructionList || []).find((i) => i.code === instrCode);

const relevanceOf = (state, qualifiedCode) =>
  instr(state, qualifiedCode, "conditional_relevance")?.text;

const parentRelevance = (state, code) => instr(state, code, "parent_relevance");

describe("enableCarryForward — choice target, selected mode", () => {
  let state;
  let target;
  beforeEach(() => {
    state = freshState();
    target = addChoiceTarget(state);
    enableCarryForward(state, { targetCode: target, sourceCode: SOURCE });
  });

  it("stores the config in the rows slot with sensible defaults", () => {
    expect(state[target].carryForward).toEqual({
      rows: { sourceCode: SOURCE, mode: "selected", carryOther: false },
    });
  });

  it("carries the regular options only, in source order (no All / None / Other)", () => {
    expect(childCodes(state, target)).toEqual([
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
    ]);
  });

  it("reuses the source option codes (Data contract)", () => {
    expect(state[`${target}A1`]).toBeDefined();
    expect(state[`${target}A7`]).toBeDefined();
    expect(state[`${target}Aall`]).toBeUndefined();
    expect(state[`${target}Anone`]).toBeUndefined();
  });

  it("mirrors the source labels across languages", () => {
    expect(state[`${target}A1`].content.en.label).toBe(
      sample.Q835lqiA1.content.en.label,
    );
    expect(state[`${target}A5`].content.en.label).toBe(
      sample.Q835lqiA5.content.en.label,
    );
  });

  it("generates per-option relevance keyed off the source value", () => {
    expect(relevanceOf(state, `${target}A1`)).toBe(
      "(Q835lqi.value || []).indexOf('A1') > -1",
    );
  });

  it("does not add an All-of-the-above term (All is a UI decorator)", () => {
    // The source has an Aall option, but ticking it selects every regular
    // option at runtime, so no `|| indexOf('Aall')` term is needed.
    expect(relevanceOf(state, `${target}A3`)).not.toContain("Aall");
  });
});

describe("enableCarryForward — Other and mode handling", () => {
  it("appends Other last when carryOther is on (selected mode)", () => {
    const state = freshState();
    const target = addChoiceTarget(state);
    enableCarryForward(state, {
      targetCode: target,
      sourceCode: SOURCE,
      carryOther: true,
    });
    expect(childCodes(state, target)).toEqual([
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "Aother",
    ]);
    expect(relevanceOf(state, `${target}Aother`)).toBe(
      "(Q835lqi.value || []).indexOf('Aother') > -1",
    );
  });

  it("pipes the respondent's typed text into the carried Other label", () => {
    const state = freshState();
    const target = addChoiceTarget(state);
    enableCarryForward(state, {
      targetCode: target,
      sourceCode: SOURCE,
      carryOther: true,
    });
    // label is a content pipe to the source Atext value (not the static "Other")
    expect(state[`${target}Aother`].content.en.label).toBe(
      "{{Q835lqiAotherAtext.value}}",
    );
    // and a matching format instruction is generated so the runtime resolves it
    const formatInstr = (state[`${target}Aother`].instructionList || []).find(
      (i) => i.code.startsWith("format_label_en") && i.text === "Q835lqiAotherAtext.value",
    );
    expect(formatInstr).toBeDefined();
  });

  it("forces carryOther off and negates relevance (no All term) in unselected mode", () => {
    const state = freshState();
    const target = addChoiceTarget(state);
    enableCarryForward(state, {
      targetCode: target,
      sourceCode: SOURCE,
      mode: "unselected",
      carryOther: true,
    });
    expect(state[target].carryForward.rows.carryOther).toBe(false);
    expect(childCodes(state, target)).not.toContain("Aother");
    expect(relevanceOf(state, `${target}A1`)).toBe(
      "!((Q835lqi.value || []).indexOf('A1') > -1)",
    );
  });
});

describe("local None of the above is preserved and kept last", () => {
  it("keeps a target-local None after carrying", () => {
    const state = freshState();
    const target = addChoiceTarget(state);
    addNewAnswer(state, { questionCode: target, type: "none" });
    enableCarryForward(state, { targetCode: target, sourceCode: SOURCE });
    const codes = childCodes(state, target);
    expect(codes).toEqual(["A1", "A2", "A3", "A4", "A5", "A6", "A7", "Anone"]);
    expect(codes[codes.length - 1]).toBe("Anone");
  });
});

describe("sync on source mutations (via the resync hooks)", () => {
  let state;
  let target;
  beforeEach(() => {
    state = freshState();
    target = addChoiceTarget(state);
    enableCarryForward(state, { targetCode: target, sourceCode: SOURCE });
  });

  it("reflects a source label rename", () => {
    changeContent(state, {
      code: "Q835lqiA1",
      key: "label",
      value: "<p>Renamed</p>",
      lang: "en",
    });
    expect(state[`${target}A1`].content.en.label).toBe("<p>Renamed</p>");
  });

  it("reflects a new source option being added", () => {
    addNewAnswer(state, { questionCode: SOURCE, label: "Yoghurt" });
    expect(childCodes(state, target)).toContain("A8");
    expect(state[`${target}A8`].content.en.label).toBe("Yoghurt");
  });

  it("reflects a source option being removed", () => {
    removeAnswer(state, "Q835lqiA7");
    expect(childCodes(state, target)).not.toContain("A7");
    expect(state[`${target}A7`]).toBeUndefined();
  });

  it("keeps relevance stable when the source All option is removed", () => {
    removeAnswer(state, "Q835lqiAall");
    expect(relevanceOf(state, `${target}A1`)).toBe(
      "(Q835lqi.value || []).indexOf('A1') > -1",
    );
  });
});

describe("array target — row and column axes", () => {
  it("replaces rows, preserves columns, and keeps columns first", () => {
    const state = freshState();
    enableCarryForward(state, {
      targetCode: ARRAY,
      sourceCode: SOURCE,
      axis: "rows",
    });
    const cols = state[ARRAY].children.filter((c) => c.type === "column");
    const rows = state[ARRAY].children.filter((c) => c.type === "row");
    expect(cols.map((c) => c.code)).toEqual(["Ac1", "Ac2", "Ac3"]);
    expect(rows.map((c) => c.code)).toEqual([
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
    ]);
    // columns precede rows in the persisted order
    const types = state[ARRAY].children.map((c) => c.type);
    expect(types.lastIndexOf("column")).toBeLessThan(types.indexOf("row"));
    expect(state[`${ARRAY}A1`].content.en.label).toBe(
      sample.Q835lqiA1.content.en.label,
    );
  });

  it("remaps carried columns to Ac* to avoid colliding with row codes", () => {
    const state = freshState();
    enableCarryForward(state, {
      targetCode: ARRAY,
      sourceCode: SOURCE,
      axis: "columns",
    });
    const cols = state[ARRAY].children.filter((c) => c.type === "column");
    const rows = state[ARRAY].children.filter((c) => c.type === "row");
    // 7 carried columns, remapped to Ac1..Ac7 (no clash with the original rows)
    expect(cols.map((c) => c.code)).toEqual([
      "Ac1",
      "Ac2",
      "Ac3",
      "Ac4",
      "Ac5",
      "Ac6",
      "Ac7",
    ]);
    // original rows untouched
    expect(rows.map((c) => c.code)).toEqual(["A1", "A2", "A3", "A4"]);
    // carried column mirrors source label, relevance keys off the source code
    expect(state[`${ARRAY}Ac1`].content.en.label).toBe(
      sample.Q835lqiA1.content.en.label,
    );
    expect(relevanceOf(state, `${ARRAY}Ac1`)).toBe(
      "(Q835lqi.value || []).indexOf('A1') > -1",
    );
  });
});

describe("question-level hide (parent_relevance)", () => {
  it("emits one group of carried option codes for a choice target", () => {
    const state = freshState();
    const target = addChoiceTarget(state);
    enableCarryForward(state, { targetCode: target, sourceCode: SOURCE });
    expect(parentRelevance(state, target)).toEqual({
      code: "parent_relevance",
      children: [["A1", "A2", "A3", "A4", "A5", "A6", "A7"]],
    });
  });

  it("includes the carried Other, and never the local None", () => {
    const state = freshState();
    const target = addChoiceTarget(state);
    addNewAnswer(state, { questionCode: target, type: "none" });
    enableCarryForward(state, {
      targetCode: target,
      sourceCode: SOURCE,
      carryOther: true,
    });
    const group = parentRelevance(state, target).children[0];
    expect(group).toContain("Aother");
    expect(group).not.toContain("Anone");
  });

  it("emits one group per carried axis for an array (rows + columns)", () => {
    const state = freshState();
    enableCarryForward(state, { targetCode: ARRAY, sourceCode: SOURCE, axis: "rows" });
    // only rows carried so far → single group
    expect(parentRelevance(state, ARRAY).children).toEqual([
      ["A1", "A2", "A3", "A4", "A5", "A6", "A7"],
    ]);
    // carry columns too → two groups [rows, columns]
    enableCarryForward(state, { targetCode: ARRAY, sourceCode: SOURCE, axis: "columns" });
    expect(parentRelevance(state, ARRAY).children).toEqual([
      ["A1", "A2", "A3", "A4", "A5", "A6", "A7"],
      ["Ac1", "Ac2", "Ac3", "Ac4", "Ac5", "Ac6", "Ac7"],
    ]);
  });

  it("is removed when carry forward is disabled", () => {
    const state = freshState();
    const target = addChoiceTarget(state);
    enableCarryForward(state, { targetCode: target, sourceCode: SOURCE });
    expect(parentRelevance(state, target)).toBeDefined();
    disableCarryForward(state, { targetCode: target });
    expect(parentRelevance(state, target)).toBeUndefined();
  });
});

describe("updateCarryForward / disableCarryForward", () => {
  it("re-syncs when the mode changes", () => {
    const state = freshState();
    const target = addChoiceTarget(state);
    enableCarryForward(state, { targetCode: target, sourceCode: SOURCE });
    updateCarryForward(state, { targetCode: target, mode: "unselected" });
    expect(state[target].carryForward.rows.mode).toBe("unselected");
    expect(relevanceOf(state, `${target}A1`)).toBe(
      "!((Q835lqi.value || []).indexOf('A1') > -1)",
    );
  });

  it("stops syncing and strips carry relevance on disable (editable copy remains)", () => {
    const state = freshState();
    const target = addChoiceTarget(state);
    enableCarryForward(state, { targetCode: target, sourceCode: SOURCE });
    disableCarryForward(state, { targetCode: target });

    expect(state[target].carryForward).toBeUndefined();
    // options remain...
    expect(childCodes(state, target)).toContain("A1");
    // ...but as a plain copy: no carry-owned relevance
    expect(relevanceOf(state, `${target}A1`)).toBeUndefined();
    // and further source edits no longer propagate
    changeContent(state, {
      code: "Q835lqiA1",
      key: "label",
      value: "<p>Changed</p>",
      lang: "en",
    });
    expect(state[`${target}A1`].content.en.label).not.toBe("<p>Changed</p>");
  });
});

describe("converting the source type", () => {
  let state;
  let target;
  beforeEach(() => {
    state = freshState();
    target = addChoiceTarget(state);
    enableCarryForward(state, { targetCode: target, sourceCode: SOURCE });
  });

  it("severs the link when the source becomes an ineligible type (mcq -> scq)", () => {
    convertQuestion(state, { questionCode: SOURCE, newType: "scq" });

    // the carry config is gone...
    expect(state[target].carryForward).toBeUndefined();
    // ...options survive as a plain editable copy, without carry relevance...
    expect(childCodes(state, target)).toContain("A1");
    expect(relevanceOf(state, `${target}A1`)).toBeUndefined();
    // ...and further source edits no longer propagate
    changeContent(state, {
      code: "Q835lqiA1",
      key: "label",
      value: "<p>Changed</p>",
      lang: "en",
    });
    expect(state[`${target}A1`].content.en.label).not.toBe("<p>Changed</p>");
  });

  it("keeps the link when the source stays an eligible type (mcq -> icon_mcq)", () => {
    convertQuestion(state, { questionCode: SOURCE, newType: "icon_mcq" });

    expect(state[target].carryForward).toEqual({
      rows: { sourceCode: SOURCE, mode: "selected", carryOther: false },
    });
    // still syncing: a source label rename propagates to the target
    changeContent(state, {
      code: "Q835lqiA1",
      key: "label",
      value: "<p>Renamed</p>",
      lang: "en",
    });
    expect(state[`${target}A1`].content.en.label).toBe("<p>Renamed</p>");
  });
});
