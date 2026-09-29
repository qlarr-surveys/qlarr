// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect } from "vitest";
import { buildDesignState, cloneQuestion } from "../state/mutations";
import sample from "./fixtures/sample-survey.json";

const SOURCE = "Q835lqi"; // an mcq question in the fixture

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

describe("cloneQuestion", () => {
  it("clones a question whose state entry is a Proxy (i.e. an immer draft)", () => {
    const state = freshState();
    // On the frontend the reducer runs on an immer draft, so state[code] is a
    // Proxy. structuredClone rejects proxies (DataCloneError), which used to make
    // clone silently fail; creatNewState must deep-clone through the proxy.
    state[SOURCE] = new Proxy(state[SOURCE], {});
    expect(() => structuredClone(state[SOURCE])).toThrow(); // guards the regression

    expect(() => cloneQuestion(state, SOURCE)).not.toThrow();

    const newCode = state.focus;
    expect(newCode).toBeDefined();
    expect(newCode).not.toBe(SOURCE);
    expect(state[newCode]).toBeDefined();
    expect(state[newCode].type).toBe("mcq");
    // the copied options come along under the new question's code
    expect(state[`${newCode}A1`]).toBeDefined();
  });
});
