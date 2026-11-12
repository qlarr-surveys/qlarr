// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect } from "vitest";
import { buildDesignState, onDrag } from "../state/mutations";
import { setupOptions } from "../constants/design";
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

const childCodes = (state, groupCode) =>
  state[groupCode].children.map((question) => question.code);

const QUESTION_TYPES = [
  "text_display",
  "image_display",
  "video_display",
  "text",
  "number",
  "email",
  "autocomplete",
  "paragraph",
  "file_upload",
  "signature",
  "photo_capture",
  "barcode",
  "video_capture",
  "date_time",
  "date",
  "time",
  "scq",
  "icon_scq",
  "image_scq",
  "mcq",
  "hierarchical_autocomplete",
  "multiple_text",
  "ranking",
  "image_ranking",
  "icon_mcq",
  "image_mcq",
  "scq_icon_array",
  "mcq_array",
  "scq_array",
  "nps",
];

const generalRules = (type) =>
  setupOptions(type)?.find((section) => section.key === "general")?.rules ||
  [];

describe("move_question setup rule", () => {
  it.each(QUESTION_TYPES)("is offered for %s", (type) => {
    expect(generalRules(type)[0]).toBe("move_question");
  });

  it.each(["group", "welcome", "end", "options", "other_text", "text_item"])(
    "is not offered for %s",
    (type) => {
      expect(generalRules(type)).not.toContain("move_question");
    },
  );
});

describe("onDrag with reveal", () => {
  it("reveals a question reordered within its page", () => {
    const state = freshState();
    onDrag(state, {
      type: "reorder_questions",
      source: "G1",
      destination: "G1",
      id: "Q835lqi",
      fromIndex: 2,
      toIndex: 1,
      reveal: true,
    });

    expect(childCodes(state, "G1")).toEqual(["Q835lqi", "Q298jbb", "Q867ezm"]);
    expect(state.skipScroll).toBe(false);
    expect(state.lastAddedComponent).toEqual({
      type: "question",
      code: "Q835lqi",
      groupCode: "G1",
    });
  });

  it("lands on top of a later page and at the bottom of an earlier one", () => {
    const state = freshState();
    onDrag(state, {
      type: "reparent_question",
      source: "G1",
      destination: "G948ohe",
      id: "Q298jbb",
      reveal: true,
    });
    expect(childCodes(state, "G948ohe")).toEqual(["Q298jbb", "Q976owq"]);
    expect(state.lastAddedComponent).toMatchObject({
      code: "Q298jbb",
      groupCode: "G948ohe",
    });

    onDrag(state, {
      type: "reparent_question",
      source: "G948ohe",
      destination: "G1",
      id: "Q976owq",
      reveal: true,
    });
    expect(childCodes(state, "G1")).toEqual(["Q867ezm", "Q835lqi", "Q976owq"]);
    expect(state.lastAddedComponent).toMatchObject({
      code: "Q976owq",
      groupCode: "G1",
    });
  });

  it("leaves scrolling alone for a plain drag", () => {
    const state = freshState();
    const before = state.lastAddedComponent;
    onDrag(state, {
      type: "reorder_questions",
      source: "G1",
      destination: "G1",
      id: "Q835lqi",
      fromIndex: 2,
      toIndex: 1,
    });

    expect(state.skipScroll).toBe(true);
    expect(state.lastAddedComponent).toBe(before);
  });
});
