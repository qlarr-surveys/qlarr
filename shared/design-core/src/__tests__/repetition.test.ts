// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect, beforeEach } from "vitest";
import {
  buildDesignState,
  addNewAnswer,
  removeAnswer,
} from "../state/mutations";
import { createQuestion } from "../factory/questionFactory";
import { accessibleDependencies } from "../utils/dependencies";
import {
  buildRepeatInfo,
  enableRepetition,
  disableRepetition,
  updateRepetitionSource,
  resyncRepeatablesForSource,
  isRepeatable,
  isInsideRepeatable,
  hasRepeatableAncestor,
  REPEAT_TOKEN_PLACEHOLDER,
  REPEAT_NUMBER_MAX,
} from "../state/repetition";
import sample from "./fixtures/sample-survey.json";

const MCQ = "Q835lqi"; // mcq: Aall, A1..A7, Anone, Aother(+Atext)
const GROUP = "G948ohe"; // content group that holds the source

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

// Append a bare question of `type` to the content group and return its code.
const addQuestion = (state, type, qId) => {
  const created = createQuestion(type, qId, "en");
  const code = `Q${qId}`;
  Object.keys(created).forEach((k) => {
    if (k !== "question") state[k] = created[k];
  });
  state[GROUP].children.push(created.question);
  return code;
};

describe("repetition — MCQ source", () => {
  let state;
  let target;
  beforeEach(() => {
    state = freshState();
    target = addQuestion(state, "text", "rep");
  });

  it("derives range from option codes with the A prefix stripped (1..7)", () => {
    enableRepetition(state, { code: target });
    updateRepetitionSource(state, { code: target, kind: "mcq", sourceCode: MCQ });

    const info = state[target].repeatInfo;
    expect(info.type).toBe("repeatable");
    // A1..A7 -> "1".."7"; Aall / Anone excluded; Aother excluded (carryOther off)
    expect(info.range).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });

  it("generates the per-option relevance rebuilding the answer code", () => {
    enableRepetition(state, { code: target });
    updateRepetitionSource(state, { code: target, kind: "mcq", sourceCode: MCQ });

    expect(state[target].repeatInfo.relevanceInstruction).toBe(
      `(${MCQ}.value || []).indexOf('A${REPEAT_TOKEN_PLACEHOLDER}') > -1`,
    );
  });

  it("includes Other only when carryOther is set", () => {
    enableRepetition(state, { code: target });
    updateRepetitionSource(state, {
      code: target,
      kind: "mcq",
      sourceCode: MCQ,
      carryOther: true,
    });
    expect(state[target].repeatInfo.range).toContain("other");

    updateRepetitionSource(state, { code: target, carryOther: false });
    expect(state[target].repeatInfo.range).not.toContain("other");
  });

  it("regenerates range when a source option is added or removed", () => {
    enableRepetition(state, { code: target });
    updateRepetitionSource(state, { code: target, kind: "mcq", sourceCode: MCQ });
    expect(state[target].repeatInfo.range).toHaveLength(7);

    addNewAnswer(state, { questionCode: MCQ, label: "new", type: undefined });
    expect(state[target].repeatInfo.range).toHaveLength(8);

    const last = state[MCQ].children.filter(
      (c) => !state[c.qualifiedCode]?.type,
    ).pop();
    removeAnswer(state, last.qualifiedCode);
    expect(state[target].repeatInfo.range).toHaveLength(7);
  });
});

describe("repetition — number source", () => {
  let state;
  let target;
  let num;
  beforeEach(() => {
    state = freshState();
    num = addQuestion(state, "number", "cnt");
    target = addQuestion(state, "text", "rep");
  });

  it("derives range as 1..max and a >= relevance", () => {
    enableRepetition(state, { code: target });
    updateRepetitionSource(state, {
      code: target,
      kind: "number",
      sourceCode: num,
      max: 5,
    });

    const info = state[target].repeatInfo;
    expect(info.range).toEqual(["1", "2", "3", "4", "5"]);
    expect(info.relevanceInstruction).toBe(
      `${num}.value >= ${REPEAT_TOKEN_PLACEHOLDER}`,
    );
  });

  it("defaults range to the cap when max is never set (input shows the cap)", () => {
    enableRepetition(state, { code: target });
    updateRepetitionSource(state, {
      code: target,
      kind: "number",
      sourceCode: num,
    });
    // no max supplied → range 1..cap, and max persisted explicitly
    expect(state[target].repeatInfo.range).toHaveLength(REPEAT_NUMBER_MAX);
    expect(state[target].repeatSource.max).toBe(REPEAT_NUMBER_MAX);
  });

  it("caps max at the engine limit of 12", () => {
    enableRepetition(state, { code: target });
    updateRepetitionSource(state, {
      code: target,
      kind: "number",
      sourceCode: num,
      max: 99,
    });
    expect(state[target].repeatInfo.range).toHaveLength(REPEAT_NUMBER_MAX);
  });
});

describe("repetition — lifecycle & guards", () => {
  let state;
  beforeEach(() => {
    state = freshState();
  });

  it("disable drops both repeatSource and repeatInfo", () => {
    const target = addQuestion(state, "text", "rep");
    enableRepetition(state, { code: target });
    updateRepetitionSource(state, { code: target, kind: "mcq", sourceCode: MCQ });
    expect(state[target].repeatInfo).toBeTruthy();

    disableRepetition(state, { code: target });
    expect(state[target].repeatSource).toBeUndefined();
    expect(state[target].repeatInfo).toBeUndefined();
  });

  it("never marks an answer repeatable", () => {
    const answerCode = state[MCQ].children.find(
      (c) => !state[c.qualifiedCode]?.type,
    ).qualifiedCode;
    enableRepetition(state, { code: answerCode });
    expect(state[answerCode].repeatSource).toBeUndefined();
  });

  it("marks a group repeatable", () => {
    enableRepetition(state, { code: GROUP });
    updateRepetitionSource(state, { code: GROUP, kind: "mcq", sourceCode: MCQ });
    expect(state[GROUP].repeatInfo.type).toBe("repeatable");
  });

  it("omits repeatInfo while the source is unset or wrong-typed", () => {
    const target = addQuestion(state, "text", "rep");
    enableRepetition(state, { code: target });
    // no source yet
    expect(state[target].repeatInfo).toBeUndefined();
    // number kind pointed at an MCQ -> invalid, no repeatInfo
    updateRepetitionSource(state, {
      code: target,
      kind: "number",
      sourceCode: MCQ,
    });
    expect(state[target].repeatInfo).toBeUndefined();
  });
});

// A validated survey where a repeatable group `Grep` (range ["1"]) has been
// expanded into a copy `Grep_1` (+ its question copy `Qx_1`). Mirrors the engine's
// flat output: only the copy ROOT carries repeatInfo.type "repeated". A normal
// question `Qafter` sits after the repetition; `Qbrands` (mcq) sits before it.
const validatedWithCopies = () => ({
  designerInput: {
    state: {
      Survey: {
        defaultLang: { code: "en" },
        children: [
          { code: "G1", qualifiedCode: "G1" },
          { code: "Grep", qualifiedCode: "Grep" },
          { code: "Grep_1", qualifiedCode: "Grep_1" },
          { code: "G2", qualifiedCode: "G2" },
        ],
      },
      G1: { type: "group", children: [{ code: "Qbrands", qualifiedCode: "Qbrands" }] },
      Qbrands: { type: "mcq", children: [{ code: "A1", qualifiedCode: "QbrandsA1" }] },
      QbrandsA1: { type: "option" },
      Grep: {
        type: "group",
        repeatInfo: { type: "repeatable", range: ["1"], relevanceInstruction: "x" },
        children: [{ code: "Qx", qualifiedCode: "Qx" }],
      },
      Qx: { type: "text", children: [] },
      Grep_1: {
        type: "group",
        repeatInfo: { type: "repeated", token: "1" },
        children: [{ code: "Qx_1", qualifiedCode: "Qx_1" }],
      },
      Qx_1: { type: "text", children: [] },
      G2: { type: "group", children: [{ code: "Qafter", qualifiedCode: "Qafter" }] },
      Qafter: { type: "text", children: [] },
    },
    componentIndexList: [
      { code: "G1", parent: "Survey", minIndex: 0, maxIndex: 2, children: ["Qbrands"] },
      { code: "Qbrands", parent: "G1", minIndex: 1, maxIndex: 1 },
      { code: "Grep", parent: "Survey", minIndex: 3, maxIndex: 4, children: ["Qx"], repetitionScope: "Grep" },
      { code: "Qx", parent: "Grep", minIndex: 4, maxIndex: 4, repetitionScope: "Grep" },
      { code: "Grep_1", parent: "Survey", minIndex: 5, maxIndex: 6, children: ["Qx_1"], repetitionScope: "Grep_1" },
      { code: "Qx_1", parent: "Grep_1", minIndex: 6, maxIndex: 6, repetitionScope: "Grep_1" },
      { code: "G2", parent: "Survey", minIndex: 7, maxIndex: 8, children: ["Qafter"] },
      { code: "Qafter", parent: "G2", minIndex: 8, maxIndex: 8 },
    ],
  },
  versionDto: {},
});

describe("ingestion — strip repeated copies (Phase 2)", () => {
  it("removes copy roots + subtrees from the survey, keeps the template", () => {
    const state = buildDesignState({}, validatedWithCopies());
    expect(state.Grep).toBeTruthy(); // template kept
    expect(state.Qx).toBeTruthy();
    expect(state.Grep_1).toBeUndefined(); // copy stripped
    expect(state.Qx_1).toBeUndefined(); // copy subtree stripped
  });

  it("prunes copy refs from parent children arrays", () => {
    const state = buildDesignState({}, validatedWithCopies());
    expect(state.Survey.children.map((c) => c.code)).toEqual(["G1", "Grep", "G2"]);
  });

  it("leaves componentIndexList untouched (copies remain in the index)", () => {
    const state = buildDesignState({}, validatedWithCopies());
    expect(state.componentIndex.map((c) => c.code)).toContain("Grep_1");
    expect(state.componentIndex.map((c) => c.code)).toContain("Qx_1");
  });

  it("keeps `latest` free of copies so diffs never round-trip them", () => {
    const state = buildDesignState({}, validatedWithCopies());
    expect(state.latest.Grep_1).toBeUndefined();
    expect(state.latest.Grep).toBeTruthy();
  });
});

describe("accessibleDependencies — closed repetition scope (Phase 2)", () => {
  const cis = () => validatedWithCopies().designerInput.componentIndexList;

  it("blocks outside -> inside a repetition", () => {
    const deps = accessibleDependencies(cis(), "Qafter");
    expect(deps).toContain("Qbrands"); // global, allowed
    expect(deps).not.toContain("Qx"); // inside the repetition, blocked
    expect(deps).not.toContain("Grep");
  });

  it("allows inside -> out (global targets)", () => {
    const deps = accessibleDependencies(cis(), "Qx");
    expect(deps).toContain("Qbrands");
  });

  it("is a no-op when no repetitionScope is present", () => {
    const plain = cis().map(({ repetitionScope, ...rest }) => rest);
    const deps = accessibleDependencies(plain, "Qafter");
    expect(deps).toContain("Qx"); // without scopes, the old behavior stands
  });
});

describe("enableRepetition — clears existing relevance (Phase 4 B)", () => {
  it("strips a conditional_relevance instruction + relevance config", () => {
    const state = freshState();
    const target = addQuestion(state, "scq", "rel");
    state[target].relevance = { rule: "show_if", logic: {} };
    state[target].instructionList = [
      ...(state[target].instructionList || []),
      { code: "conditional_relevance", text: "true", returnType: "boolean", isActive: true },
    ];

    enableRepetition(state, { code: target });

    expect(state[target].relevance).toBeUndefined();
    expect(
      state[target].instructionList.find((i) => i.code === "conditional_relevance"),
    ).toBeUndefined();
    expect(state[target].repeatSource).toBeTruthy();
  });
});

describe("repetition scope helpers (Phase 4)", () => {
  const ds = () => ({
    componentIndex: [
      { code: "G1", parent: "Survey", children: ["Q1", "Q2"] },
      { code: "Q1", parent: "G1" },
      { code: "Q2", parent: "G1" },
      { code: "Q3", parent: "Survey" },
    ],
    G1: { repeatSource: { kind: "mcq", sourceCode: "Qx" } },
    Q1: {},
    Q2: {},
    Q3: {},
  });

  it("isRepeatable is true only for the marked component", () => {
    expect(isRepeatable(ds(), "G1")).toBe(true);
    expect(isRepeatable(ds(), "Q1")).toBe(false);
  });

  it("isInsideRepeatable is self-inclusive (repeatable + descendants)", () => {
    expect(isInsideRepeatable(ds(), "G1")).toBe(true); // self
    expect(isInsideRepeatable(ds(), "Q1")).toBe(true); // descendant
    expect(isInsideRepeatable(ds(), "Q3")).toBe(false); // outside
  });

  it("hasRepeatableAncestor excludes self (nesting guard)", () => {
    expect(hasRepeatableAncestor(ds(), "G1")).toBe(false); // self doesn't count
    expect(hasRepeatableAncestor(ds(), "Q2")).toBe(true); // ancestor G1
    expect(hasRepeatableAncestor(ds(), "Q3")).toBe(false);
  });
});

describe("buildRepeatInfo (pure)", () => {
  it("returns null for missing/invalid config", () => {
    const state = freshState();
    expect(buildRepeatInfo(state, null)).toBeNull();
    expect(buildRepeatInfo(state, { kind: "mcq" })).toBeNull();
    expect(
      buildRepeatInfo(state, { kind: "mcq", sourceCode: "Qnope" }),
    ).toBeNull();
  });
});
