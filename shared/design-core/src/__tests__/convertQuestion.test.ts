// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect } from "vitest";
import {
  buildDesignState,
  changeAttribute,
  changeRelevance,
  convertQuestion,
} from "../state/mutations";
import { createQuestion } from "../factory/questionFactory";
import { addQuestionValueInstruction } from "../state/addInstructions";
import sample from "./fixtures/sample-survey.json";

const GROUP = "G948ohe";

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

const addQuestion = (state, type, qId) => {
  const created = createQuestion(type, qId, "en");
  Object.keys(created).forEach((k) => {
    if (k !== "question") state[k] = created[k];
  });
  state[GROUP].children.push(created.question);
  addQuestionValueInstruction(state[`Q${qId}`]);
  return `Q${qId}`;
};

const valueInstruction = (state, code) =>
  state[code].instructionList.find((i) => i.code === "value");

describe("convertQuestion — text group value returnType", () => {
  it("switches value returnType between string and double", () => {
    const state = freshState();
    const code = addQuestion(state, "text", "conv");
    expect(valueInstruction(state, code).returnType).toBe("string");

    convertQuestion(state, { questionCode: code, newType: "number" });
    expect(valueInstruction(state, code).returnType).toBe("double");

    convertQuestion(state, { questionCode: code, newType: "paragraph" });
    expect(valueInstruction(state, code).returnType).toBe("string");
  });

  it("clears a stale value when the returnType changes", () => {
    const state = freshState();
    const code = addQuestion(state, "text", "conv");
    valueInstruction(state, code).text = "abc";

    convertQuestion(state, { questionCode: code, newType: "number" });
    expect(valueInstruction(state, code).text).toBe("");
  });

  it("keeps the value when the returnType is unchanged", () => {
    const state = freshState();
    const code = addQuestion(state, "text", "conv");
    valueInstruction(state, code).text = "abc";

    convertQuestion(state, { questionCode: code, newType: "email" });
    expect(valueInstruction(state, code).text).toBe("abc");
  });
});

describe("convertQuestion — number decimal separator", () => {
  const maskedValue = (state, code) =>
    state[code].instructionList.find((i) => i.code === "masked_value");

  it("drops decimal_separator and masked_value when leaving number", () => {
    const state = freshState();
    const code = addQuestion(state, "number", "num");
    changeAttribute(state, { code, key: "decimal_separator", value: "," });
    expect(maskedValue(state, code)).toBeDefined();

    convertQuestion(state, { questionCode: code, newType: "text" });
    expect(state[code].decimal_separator).toBeUndefined();
    expect(maskedValue(state, code)).toBeUndefined();
  });

  it("builds masked_value when converting to number with a comma separator", () => {
    const state = freshState();
    const code = addQuestion(state, "text", "num");
    state[code].decimal_separator = ",";

    convertQuestion(state, { questionCode: code, newType: "number" });
    expect(maskedValue(state, code)?.isActive).toBe(true);
  });
});

describe("convertQuestion — recompiles relevance that reads the question", () => {
  const relevanceText = (state, code) =>
    state[code].instructionList.find((i) => i.code === "conditional_relevance")
      ?.text;

  it("switches the `in` check between single and multi select", () => {
    const state = freshState();
    const source = addQuestion(state, "scq", "src");
    const dependent = addQuestion(state, "text", "dep");
    changeRelevance(state, {
      code: dependent,
      value: {
        rule: "show_if",
        logic: { in: [{ var: source }, ["A1"]] },
      },
    });
    expect(relevanceText(state, dependent)).toBe(
      `["A1"].indexOf(${source}.value) !== -1`,
    );

    convertQuestion(state, { questionCode: source, newType: "mcq" });
    expect(relevanceText(state, dependent)).toBe(
      `['A1'].filter((el) => ${source}.value?.indexOf(el) > -1).length > 0`,
    );

    convertQuestion(state, { questionCode: source, newType: "scq" });
    expect(relevanceText(state, dependent)).toBe(
      `["A1"].indexOf(${source}.value) !== -1`,
    );
  });

  it("leaves relevance that reads other questions untouched", () => {
    const state = freshState();
    const source = addQuestion(state, "scq", "src");
    const other = addQuestion(state, "scq", "oth");
    const dependent = addQuestion(state, "text", "dep");
    changeRelevance(state, {
      code: dependent,
      value: { rule: "show_if", logic: { in: [{ var: other }, ["A1"]] } },
    });
    const before = structuredClone(state[dependent].instructionList);

    convertQuestion(state, { questionCode: source, newType: "mcq" });
    expect(state[dependent].instructionList).toEqual(before);
  });

  it("recompiles relevance that also reads a deleted question", () => {
    const state = freshState();
    const source = addQuestion(state, "scq", "src");
    const gone = addQuestion(state, "scq", "gone");
    const dependent = addQuestion(state, "text", "dep");
    changeRelevance(state, {
      code: dependent,
      value: {
        rule: "show_if",
        logic: {
          or: [
            { in: [{ var: source }, ["A1"]] },
            { in: [{ var: gone }, ["A1"]] },
          ],
        },
      },
    });
    delete state[gone];

    convertQuestion(state, { questionCode: source, newType: "mcq" });
    expect(relevanceText(state, dependent)).toBe(
      `['A1'].filter((el) => ${source}.value?.indexOf(el) > -1).length > 0 || ` +
        `["A1"].indexOf(${gone}.value) !== -1`,
    );
  });
});

describe("relevance on an mcq_array row", () => {
  const ARRAY = "Q976owq"; // scq_array in the fixture

  const relevanceText = (state, code) =>
    state[code].instructionList.find((i) => i.code === "conditional_relevance")
      ?.text;

  it.each([
    ["in", "> 0"],
    ["not_in", "== 0"],
  ])("compiles `%s` as a list check", (op, comparison) => {
    const state = freshState();
    convertQuestion(state, { questionCode: ARRAY, newType: "mcq_array" });
    const row = state[ARRAY].children.find((c) => c.type === "row")
      .qualifiedCode;
    const dependent = addQuestion(state, "text", "dep");
    changeRelevance(state, {
      code: dependent,
      value: { rule: "show_if", logic: { [op]: [{ var: row }, ["Ac1"]] } },
    });
    expect(relevanceText(state, dependent)).toBe(
      `['Ac1'].filter((el) => ${row}.value?.indexOf(el) > -1).length ${comparison}`,
    );
  });
});
