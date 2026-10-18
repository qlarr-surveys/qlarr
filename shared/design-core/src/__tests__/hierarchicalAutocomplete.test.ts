// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect } from "vitest";
import { buildDesignState, removeAnswer } from "../state/mutations";
import {
  addMaskedValuesInstructions,
  addQuestionValueInstruction,
} from "../state/addInstructions";
import { createQuestion } from "../factory/questionFactory";
import { buildCodeIndex } from "../utils/pureUtils";
import sample from "./fixtures/sample-survey.json";

const CODE = "Qh1";

// A design state with a fresh hierarchical question (3 levels) in the last group.
const stateWithQuestion = () => {
  const state = buildDesignState(
    {},
    {
      designerInput: { state: structuredClone(sample), componentIndexList: [] },
      versionDto: {},
    },
  );
  const created = createQuestion("hierarchical_autocomplete", "h1", "en");
  Object.keys(created).forEach((k) => {
    if (k !== "question") state[k] = created[k];
  });
  state[`${CODE}A3`] = {};
  state[CODE].children.push({ code: "A3", qualifiedCode: `${CODE}A3` });
  state.G948ohe.children.push(created.question);
  state.index = buildCodeIndex(state);
  addQuestionValueInstruction(state[CODE]);
  addMaskedValuesInstructions(CODE, state[CODE], state);
  return state;
};

const instr = (state, code, instrCode) =>
  (state[code].instructionList || []).find((i) => i.code === instrCode);

const maskedText = (i) =>
  `QlarrScripts.safeAccess(QlarrScripts.safeAccess(${CODE}.value_meta, Survey.lang), ${i})`;

describe("hierarchical_autocomplete instructions", () => {
  it("gives the root question an inactive map value_meta", () => {
    const state = stateWithQuestion();
    expect(instr(state, CODE, "value_meta")).toEqual({
      code: "value_meta",
      isActive: false,
      returnType: "map",
      text: "",
    });
  });

  it("gives each level a masked_value reading its position in the current language", () => {
    const state = stateWithQuestion();
    ["A1", "A2", "A3"].forEach((code, i) => {
      expect(instr(state, CODE + code, "masked_value")).toEqual({
        code: "masked_value",
        isActive: true,
        returnType: "string",
        text: maskedText(i),
      });
    });
  });

  it("re-indexes the remaining levels when one is removed", () => {
    const state = stateWithQuestion();
    removeAnswer(state, `${CODE}A2`);
    expect(instr(state, `${CODE}A1`, "masked_value").text).toBe(maskedText(0));
    expect(instr(state, `${CODE}A3`, "masked_value").text).toBe(maskedText(1));
  });
});
