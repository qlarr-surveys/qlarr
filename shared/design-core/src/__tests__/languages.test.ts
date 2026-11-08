// @ts-nocheck — mirrors the loose JS-origin state shape used across mutations.
import { describe, it, expect, beforeEach } from "vitest";
import {
  buildDesignState,
  changeLang,
  onAdditionalLangAdded,
  onAdditionalLangRemoved,
  onBaseLangChanged,
} from "../state/mutations";
import { LANGUAGE_DEF } from "../constants/language";
import sample from "./fixtures/sample-survey.json";

const load = (state = {}, survey = {}) =>
  buildDesignState(state, {
    designerInput: {
      state: { ...structuredClone(sample), Survey: { ...structuredClone(sample.Survey), ...survey } },
      componentIndexList: [],
    },
    versionDto: { version: 1, subVersion: 1 },
  });

const codes = (state) => state.langInfo.languagesList.map((l) => l.code);

describe("survey languages", () => {
  let state;
  beforeEach(() => {
    state = load();
    onAdditionalLangAdded(state, LANGUAGE_DEF.ar);
  });

  it("starts out with the primary language alone", () => {
    expect(load().langInfo).toEqual({
      languagesList: [LANGUAGE_DEF.en],
      mainLang: "en",
      lang: "en",
      onMainLang: true,
    });
  });

  it("adds a translation to the survey and to the editor's list", () => {
    expect(codes(state)).toEqual(["en", "ar"]);
    expect(state.Survey.additionalLang).toEqual([LANGUAGE_DEF.ar]);
  });

  it("ignores a language the survey already has", () => {
    onAdditionalLangAdded(state, LANGUAGE_DEF.ar);

    expect(codes(state)).toEqual(["en", "ar"]);
  });

  it("ignores the primary language being added as a translation", () => {
    onAdditionalLangAdded(state, LANGUAGE_DEF.en);

    expect(codes(state)).toEqual(["en", "ar"]);
  });

  it("drops the new primary language from the translations", () => {
    onBaseLangChanged(state, LANGUAGE_DEF.ar);

    expect(codes(state)).toEqual(["ar"]);
    expect(state.langInfo.mainLang).toBe("ar");
    expect(state.langInfo.lang).toBe("ar");
  });

  it("removes a translation from the survey and from the editor's list", () => {
    onAdditionalLangRemoved(state, LANGUAGE_DEF.ar);

    expect(codes(state)).toEqual(["en"]);
    expect(state.Survey.additionalLang).toEqual([]);
  });

  it("keeps the language being edited when another one is removed", () => {
    onAdditionalLangAdded(state, LANGUAGE_DEF.de);
    changeLang(state, "ar");
    onAdditionalLangRemoved(state, LANGUAGE_DEF.de);

    expect(codes(state)).toEqual(["en", "ar"]);
    expect(state.langInfo.lang).toBe("ar");
  });

  it("shows a survey saved with a language twice only once", () => {
    const loaded = load(
      {},
      {
        defaultLang: LANGUAGE_DEF.nl,
        additionalLang: [
          LANGUAGE_DEF.en,
          LANGUAGE_DEF.de,
          LANGUAGE_DEF.en,
          LANGUAGE_DEF.nl,
        ],
      },
    );

    expect(codes(loaded)).toEqual(["nl", "en", "de"]);
    expect(loaded.Survey.additionalLang).toEqual([
      LANGUAGE_DEF.en,
      LANGUAGE_DEF.de,
    ]);
  });

  it("follows the survey's languages when a save comes back", () => {
    changeLang(state, "ar");
    load(state, { additionalLang: [LANGUAGE_DEF.ar, LANGUAGE_DEF.de] });

    expect(codes(state)).toEqual(["en", "ar", "de"]);
    expect(state.langInfo.lang).toBe("ar");
  });
});
