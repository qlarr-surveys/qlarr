// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect } from "vitest";
import { addComponent, buildDesignState, onDrag } from "../state/mutations";
import sample from "./fixtures/sample-survey.json";

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

const firstGroup = (state) => state.Survey.children.find((g) => state[g.code].groupType === "GROUP").code;

describe("new_question", () => {
  it("uses the code it is given", () => {
    const state = freshState();
    const group = firstGroup(state);
    onDrag(state, { type: "new_question", destination: group, questionType: "scq", toIndex: 0, code: "birth_country" });
    expect(state[group].children[0].code).toBe("Qbirth_country");
    expect(state.Qbirth_country.type).toBe("scq");
    expect(state.Qbirth_country.children.every((a) => a.qualifiedCode.startsWith("Qbirth_countryA"))).toBe(true);
  });

  it("makes one up when the code it is given is taken", () => {
    const state = freshState();
    const group = firstGroup(state);
    onDrag(state, { type: "new_question", destination: group, questionType: "text", toIndex: 0, code: "age" });
    onDrag(state, { type: "new_question", destination: group, questionType: "text", toIndex: 0, code: "Qage" });
    expect(state[group].children[1].code).toBe("Qage");
    expect(state[group].children[0].code).toMatch(/^Q\d{3}[a-z]{3}$/);
  });

  it("makes one up when none is given", () => {
    const state = freshState();
    const group = firstGroup(state);
    onDrag(state, { type: "new_question", destination: group, questionType: "text", toIndex: 0 });
    expect(state[group].children[0].code).toMatch(/^Q\d{3}[a-z]{3}$/);
  });
});

describe("addComponent group", () => {
  it("uses the code it is given unless it's taken", () => {
    const state = freshState();
    addComponent(state, { type: "group", code: "Glines" });
    expect(state.Glines).toBeDefined();
    addComponent(state, { type: "group", code: "lines" });
    const codes = state.Survey.children.map((g) => g.code);
    expect(codes.filter((c) => c === "Glines")).toHaveLength(1);
    expect(codes).toHaveLength(new Set(codes).size);
  });
});
