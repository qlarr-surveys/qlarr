// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect, beforeEach } from "vitest";
import {
  buildDesignState,
  designChanges,
  changeContent,
  setShowAdvanced,
  showQuotaMessage,
  setup,
} from "../state/mutations";
import sample from "./fixtures/sample-survey.json";

const load = (state = {}) =>
  buildDesignState(state, {
    designerInput: {
      state: structuredClone(sample),
      componentIndexList: [],
    },
    versionDto: { version: 1, subVersion: 1 },
  });

describe("designChanges", () => {
  let state;
  beforeEach(() => {
    state = load();
  });

  it("is empty right after a load", () => {
    expect(designChanges(state, state.latest)).toEqual({});
  });

  it("ignores designer UI state, so a no-op action saves nothing", () => {
    showQuotaMessage(state, { code: "QT1", reveal: true });
    setShowAdvanced(state, { code: "G1", value: true });
    setup(state, { code: "G1", rules: [] });
    state.focus = "Q298jbb";

    expect(designChanges(state, state.latest)).toEqual({});
  });

  it("returns only the survey parts that changed", () => {
    showQuotaMessage(state, { code: "QT1" });
    changeContent(state, { code: "Survey", key: "label", lang: "en", value: "New" });

    const changes = designChanges(state, state.latest);
    expect(Object.keys(changes)).toEqual(["Survey"]);
    expect(changes.Survey.content.en.label).toBe("New");
  });

  it("keeps UI state on a reload but ends any edit focus", () => {
    showQuotaMessage(state, { code: "QT1" });
    setShowAdvanced(state, { code: "G1", value: true });
    state.focus = "Q298jbb";

    load(state);

    expect(state.quotaMessageView).toEqual({ code: "QT1", reveal: false });
    expect(state.advancedByCode).toEqual({ G1: true });
    expect(state.focus).toBeUndefined();
  });
});
