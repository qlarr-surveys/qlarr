// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect } from "vitest";
import { buildDesignState, changeCustomCss } from "../state/mutations";
import sample from "./fixtures/sample-survey.json";

const freshState = () =>
  buildDesignState(
    {},
    {
      designerInput: { state: structuredClone(sample), componentIndexList: [] },
      versionDto: {},
    },
  );

const cssInstructions = (state, code) =>
  (state[code].instructionList || [])
    .filter((i) => i.code.startsWith("format_custom_css_"))
    .map((i) => i.text);

describe("changeCustomCss", () => {
  it("builds one instruction per {{ }} expression", () => {
    const state = freshState();
    changeCustomCss(state, {
      code: "Q867ezm",
      value: "border: {{ Qthis.value === 'A1' ? '1px solid red' : 'none' }};\nopacity: {{ Qthis.validity ? '1' : '0.5' }};",
    });
    expect(cssInstructions(state, "Q867ezm")).toEqual([
      "Qthis.value === 'A1' ? '1px solid red' : 'none'",
      "Qthis.validity ? '1' : '0.5'",
    ]);
  });

  it("drops the old expressions when the new CSS has fewer", () => {
    const state = freshState();
    changeCustomCss(state, { code: "Q867ezm", value: "a: {{ Q1.value }}; b: {{ Q2.value }};" });
    changeCustomCss(state, { code: "Q867ezm", value: "a: {{ Q3.value }};" });
    expect(cssInstructions(state, "Q867ezm")).toEqual(["Q3.value"]);
    changeCustomCss(state, { code: "Q867ezm", value: "padding: 8px;" });
    expect(cssInstructions(state, "Q867ezm")).toEqual([]);
    expect(state.Q867ezm.customCss).toBe("padding: 8px;");
  });
});
