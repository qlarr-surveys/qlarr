// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect } from "vitest";
import {
  addNewAnswer,
  buildDesignState,
  changeAttribute,
  changeValidationValue,
  convertQuestion,
} from "../state/mutations";
import { createQuestion } from "../factory/questionFactory";
import { addQuestionValueInstruction } from "../state/addInstructions";
import { otherOptionSetup } from "../constants/design";
import { buildLogicFields } from "../logic/buildFields";
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

const addChoiceWithOther = (state, type = "scq") => {
  const created = createQuestion(type, "oth", "en");
  Object.keys(created).forEach((k) => {
    if (k !== "question") state[k] = created[k];
  });
  state[GROUP].children.push(created.question);
  addQuestionValueInstruction(state.Qoth);
  addNewAnswer(state, { questionCode: "Qoth", type: "other" });
  return "QothAotherAtext";
};

const instruction = (state, code, name) =>
  state[code].instructionList.find((i) => i.code === name);

const rulesOf = (rules, key) => rules.find((s) => s.key === key)?.rules;

describe("other text answer type", () => {
  it("is text by default", () => {
    const state = freshState();
    const code = addChoiceWithOther(state);
    expect(instruction(state, code, "value").returnType).toBe("string");
    expect(
      rulesOf(otherOptionSetup("QothAother", state[code]), "validation"),
    ).toContain("validation_pattern");
  });

  it("switching to number stores a number and offers number rules", () => {
    const state = freshState();
    const code = addChoiceWithOther(state);

    changeAttribute(state, { code, key: "other_type", value: "number" });

    expect(instruction(state, code, "value").returnType).toBe("double");
    const rules = otherOptionSetup("QothAother", state[code]);
    expect(rulesOf(rules, "general")).not.toContain("decimal_separator");
    expect(rulesOf(rules, "validation")).toContain("validation_between");
    expect(rulesOf(rules, "validation")).not.toContain("validation_pattern");
  });

  it("refreshes the Other option's settings panel, rows of the text box marked with its code", () => {
    const state = freshState();
    const code = addChoiceWithOther(state);

    changeAttribute(state, { code, key: "other_type", value: "number" });

    const rules = otherOptionSetup("QothAother", state[code]);
    expect(state.setup).toEqual({ code: "QothAother", rules });
    const general = rules.find((s) => s.key === "general");
    expect(general.rules).toEqual(["disabled", "other_type", "maxChars"]);
    expect(general.ruleCodes).toEqual({ other_type: code, maxChars: code });
    const validation = rules.find((s) => s.key === "validation");
    expect(validation.rules).toContain("validation_between");
    expect(validation.ruleCodes.validation_between).toBe(code);
    expect(rules.find((s) => s.key === "logic").ruleCodes).toBeUndefined();
  });

  it("drops rules the new type does not support", () => {
    const state = freshState();
    const code = addChoiceWithOther(state);
    changeValidationValue(state, {
      code,
      rule: "validation_pattern",
      key: "isActive",
      value: true,
    });
    changeValidationValue(state, {
      code,
      rule: "validation_required",
      key: "isActive",
      value: true,
    });

    changeAttribute(state, { code, key: "other_type", value: "number" });

    expect(state[code].validation.validation_pattern).toBeUndefined();
    expect(instruction(state, code, "validation_pattern")).toBeUndefined();
    expect(state[code].validation.validation_required).toBeDefined();
  });

  it("switching back to text restores a string value", () => {
    const state = freshState();
    const code = addChoiceWithOther(state);
    changeAttribute(state, { code, key: "other_type", value: "number" });

    changeAttribute(state, { code, key: "other_type", value: "text" });

    expect(instruction(state, code, "value").returnType).toBe("string");
  });

  it("keeps the number type when the question is converted", () => {
    const state = freshState();
    const code = addChoiceWithOther(state);
    changeAttribute(state, { code, key: "other_type", value: "number" });

    convertQuestion(state, { questionCode: "Qoth", newType: "mcq" });

    expect(instruction(state, code, "value").returnType).toBe("double");
  });

  it("shows a number Other as text in the question's display value", () => {
    const state = freshState();
    const code = addChoiceWithOther(state);
    const masked = () => instruction(state, "Qoth", "masked_value").text;
    expect(masked()).toContain(`"Aother": ${code}.value}`);

    changeAttribute(state, { code, key: "other_type", value: "number" });
    expect(masked()).toContain(`${code}.value.toString()`);

    changeAttribute(state, { code, key: "other_type", value: "text" });
    expect(masked()).toContain(`"Aother": ${code}.value}`);
  });

  it("offers number operators in logic", () => {
    const state = freshState();
    const code = addChoiceWithOther(state);
    changeAttribute(state, { code, key: "other_type", value: "number" });

    const field = buildLogicFields({
      componentIndices: [{ code: GROUP }, { code: "Qoth", parent: GROUP }],
      currentCode: "Survey",
      designState: state,
      mainLang: "en",
    }).find((f) => f.code === code);
    expect(field.type).toBe("number");
  });
});
