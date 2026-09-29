// @ts-nocheck — loose JS-origin logic; internals stay untyped, public API typed at index.ts
// Redux-agnostic survey mutation logic.
//
// Every exported `fn(state, payload)` mutates the `state` object in place and
// knows nothing about Redux/immer. The frontend passes an immer draft (via a
// one-line delegator reducer); the backend / AI pass a plain object. Same code,
// same behaviour — the only difference is who owns the object.

import {
  firstIndexInArray,
  isEquivalent,
  nextId,
  buildCodeIndex,
  lastIndexInArray,
} from "../utils/pureUtils";
import {
  buildValidationDefaultData,
  nextGroupId,
  nextQuestionId,
  nextQuotaCode,
  reorder,
  buildFormatInstruction,
} from "./stateUtils";
import {
  CONVERTIBLE_CHOICE_TYPES,
  CONVERTIBLE_ARRAY_TYPES,
  CONVERTIBLE_TEXT_TYPES,
  CONVERTIBLE_DATE_TIME_TYPES,
  CARRY_FORWARD_SOURCE_TYPES,
  isArrayType,
  languageSetup,
  quotaMessageKey,
  setupOptions,
  themeSetup,
} from "../constants/design";
import { convertChoiceQuestion } from "./convertChoiceQuestion";
import { convertArrayQuestion } from "./convertArrayQuestion";
import { convertTextQuestion } from "./convertTextQuestion";
import { convertDateTimeQuestion } from "./convertDateTimeQuestion";
import { createQuestion, questionDesignError } from "../factory/questionFactory";
import { createGroup } from "../factory/groupFactory";
import { DESIGN_SURVEY_MODE } from "../constants/designMode";
import {
  addAnswerInstructions,
  addMaskedValuesInstructions,
  refreshEnumForSingleChoice,
  refreshListForMultipleChoice,
  addQuestionValueInstruction,
  addSkipInstructions,
  changeInstruction,
  cleanupDefaultValue,
  conditionalRelevanceEquation,
  instructionByCode,
  processValidation,
  quotaInstruction,
  removeInstruction,
  updateRandomByRule,
  updatePriorityByRule,
} from "./addInstructions";
import { defaultSurveyTheme } from "../constants/surveyTheme";
import { LANGUAGE_DEF } from "../constants/language";

const reservedKeys = [
  "setup",
  "advancedByCode",
  "langInfo",
  "reorder_refresh_code",
  "state",
  "globalSetup",
  "designMode",
  "isSaving",
  "isUpdating",
  "latest",
  "lastAddedComponent",
  "index",
  "skipScroll",
  "advancedByCode",
  "quotaMessageView",
];

// Formerly the `designStateReceived` reducer. Mutates `state` in place and also
// returns it, so a frontend delegator can `return core.buildDesignState(...)`
// and a backend caller can `let s = core.buildDesignState({}, payload)`.
export function buildDesignState(state, payload) {
  const response = payload;
  let newState = response.designerInput.state;

  if (!newState.Survey.theme) {
    newState.Survey.theme = defaultSurveyTheme;
  }

  const newKeys = Object.keys(newState).filter(
    (el) => !reservedKeys.includes(el),
  );
  const toBeRemoved = Object.keys(state).filter(
    (el) => !reservedKeys.includes(el) && !newKeys.includes(el),
  );

  if (!state.langInfo || response.overWriteLang) {
    const defaultLang = newState.Survey.defaultLang || LANGUAGE_DEF.en;
    const mainLang = defaultLang.code;
    const lang = defaultLang.code;
    const languagesList = [defaultLang].concat(
      newState.Survey.additionalLang || [],
    );
    state.langInfo = {
      languagesList,
      mainLang,
      lang,
      onMainLang: lang == mainLang,
    };
  }

  toBeRemoved.forEach((key) => {
    delete state[key];
  });
  const inCurrentSetup = state["setup"]?.code;
  if (!newKeys.includes(inCurrentSetup)) {
    delete state["setup"];
  }

  newKeys.forEach((key) => {
    state[key] = newState[key];
  });
  state.versionDto = response.versionDto;
  state.componentIndex = response.designerInput.componentIndexList;
  state["latest"] = structuredClone(newState);
  state.lastAddedComponent = null;
  state.index = buildCodeIndex(state);
  state.designStateReceived = true;
  return state;
}

export function setup(state, payload) {
  // we want to ignore multiple clicks on the same setup button
  // but acknowledge when we highlight or expand a specific section
  if (
    payload.code != state.setup?.code ||
    !isEquivalent(payload.rules, state.setup?.rules) ||
    payload.highlighted
  ) {
    state.setup = payload;
  }
}

export function clearHighlighted(state) {
  if (state.setup) {
    delete state.setup.highlighted;
  }
}

export function setShowAdvanced(state, payload) {
  const { code, value } = payload;
  if (!state.advancedByCode) state.advancedByCode = {};
  state.advancedByCode[code] = value;
}

export function newVersionReceived(state, payload) {
  state.versionDto = payload;
}

export function changeValidationValue(state, payload) {
  if (!state[payload.code]["validation"]) {
    state[payload.code]["validation"] = {};
  }
  if (!state[payload.code]["validation"][payload.rule]) {
    state[payload.code]["validation"][payload.rule] = buildValidationDefaultData(
      payload.rule,
    );
  }
  state[payload.code]["validation"][payload.rule][payload.key] = payload.value;
  processValidation(state, payload.code, payload.rule, payload.rule != "content");
}

export function resetSetup(state) {
  if (state.langInfo) {
    state.langInfo.lang = state.langInfo.mainLang;
    state.langInfo.onMainLang = true;
  }
  if (!state.globalSetup) {
    state.globalSetup = {};
  }
  delete state["setup"];
}

export function setDesignModeToDesign(state) {
  resetSetup(state);
  state.designMode = DESIGN_SURVEY_MODE.DESIGN;
}

export function setDesignModeToLang(state) {
  resetSetup(state);
  setup(state, languageSetup);
  state.designMode = DESIGN_SURVEY_MODE.LANGUAGES;
}

export function setDesignModeToTheme(state) {
  resetSetup(state);
  setup(state, themeSetup);
  state.designMode = DESIGN_SURVEY_MODE.THEME;
}

export function addQuota(state) {
  const survey = state.Survey;
  survey.quotas = survey.quotas || [];
  survey.quotas.push({
    code: nextQuotaCode(survey.quotas),
    label: "",
    limit: 0,
    condition: { logic: null },
  });
}

// payload: { code, changes: { label?, limit?, condition? } }
export function updateQuota(state, payload) {
  const { code, changes } = payload;
  const quota = state.Survey.quotas?.find((quota) => quota.code === code);
  if (!quota) {
    return;
  }
  Object.assign(quota, changes);
  if ("condition" in changes) {
    refreshQuotaInstructions(state);
  }
}

// payload: the quota code
export function removeQuota(state, payload) {
  const survey = state.Survey;
  survey.quotas = (survey.quotas || []).filter(
    (quota) => quota.code !== payload,
  );
  const messageKey = quotaMessageKey(payload);
  Object.keys(survey.content || {}).forEach((lang) => {
    if (survey.content[lang][messageKey] === undefined) {
      return;
    }
    // clears the message's reference instructions and resources too
    changeContent(state, { code: "Survey", key: messageKey, lang, value: "" });
    delete survey.content[lang][messageKey];
  });
  refreshQuotaInstructions(state);
}

// Which quota's end message the END page shows in the designer (null for the
// default end page); `reveal` scrolls the END page into view once.
export function showQuotaMessage(state, payload) {
  const { code = null, reveal = false } = payload;
  state.quotaMessageView = { code, reveal };
}

export function quotaMessageRevealed(state) {
  if (state.quotaMessageView) {
    state.quotaMessageView.reveal = false;
  }
}

const refreshQuotaInstructions = (state) => {
  const survey = state.Survey;
  survey.instructionList = (survey.instructionList || []).filter(
    (instruction) => !instruction.code.startsWith("quota_"),
  );
  (survey.quotas || []).forEach((quota) => {
    const instruction = quotaInstruction(quota, state);
    if (!instruction.remove) {
      survey.instructionList.push(instruction);
    }
  });
};

export function changeAttribute(state, payload) {
  if (
    payload.key == "content" ||
    payload.key == "instructionList" ||
    payload.key == "relevance" ||
    payload.key == "resources"
  ) {
    throw "We are changing attributes way too much than we should";
  }
  if (!state[payload.code]) {
    state[payload.code] = {};
  }
  const originalValue = state[payload.code][payload.key];

  state[payload.code][payload.key] = payload.value;
  if (payload.key == "maxChars") {
    cleanupValidation(state, payload.code);
  } else if (payload.key == "dateFormat") {
    addMaskedValuesInstructions(payload.code, state[payload.code], state);
  } else if (payload.key == "fullDayFormat") {
    addMaskedValuesInstructions(payload.code, state[payload.code], state);
  } else if (payload.key == "decimal_separator") {
    addMaskedValuesInstructions(payload.code, state[payload.code], state);
  } else if (
    [
      "randomize_questions",
      "randomize_groups",
      "randomize_options",
      "randomize_rows",
      "randomize_columns",
    ].indexOf(payload.key) > -1
  ) {
    updateRandomByRule(
      state[payload.code],
      payload.key,
      !originalValue || originalValue == "NONE",
    );
  } else if (
    [
      "prioritise_questions",
      "prioritise_groups",
      "prioritise_options",
      "prioritise_rows",
      "prioritise_columns",
    ].indexOf(payload.key) > -1
  ) {
    updatePriorityByRule(
      state[payload.code],
      payload.key,
      !originalValue || originalValue == "NONE",
    );
  }
}

export function changeRelevance(state, payload) {
  state[payload.code].relevance = payload.value;
  addRelevanceInstructions(state, payload.code, payload.value);
}

export function clearRelevanceConfig(state, payload) {
  delete state[payload.code].relevance;
}

export function setDefaultValue(state, payload) {
  const { code, selectedValue } = payload;
  const component = state[code];
  const valueInstruction = component.instructionList?.find(
    (instruction) => instruction.code == "value",
  );
  if (valueInstruction) {
    changeInstruction(component, {
      ...valueInstruction,
      text: selectedValue,
      isActive: false,
    });
  }
}

export function cloneQuestion(state, payload) {
  const code = payload;
  const survey = state.Survey;
  const group = survey.children
    ?.map((group) => state[group.code])
    ?.filter(
      (group) =>
        group.children &&
        group.children.findIndex((child) => child.code == code) !== -1,
    )?.[0];
  if (!group) {
    return;
  }
  const newQuestionId = "Q" + nextQuestionId(state, survey.children);
  const questionChild = group.children.find((el) => el.code == code);
  const newQuestion = {
    type: questionChild.type,
    code: newQuestionId,
    qualifiedCode: newQuestionId,
  };
  creatNewState(state, state[code], newQuestionId, code, newQuestionId);
  group.children.splice(
    group.children.indexOf(questionChild) + 1,
    0,
    newQuestion,
  );
  setup(state, { code: newQuestionId, rules: setupOptions(newQuestion.type) });
  cleanupRandomRules(group);
  state.index = buildCodeIndex(state);
  state.focus = newQuestionId;
}

export function removeAnswer(state, payload) {
  const answerQualifiedCode = payload;
  const codes = splitQuestionCodes(answerQualifiedCode);
  let question = state[codes[0]];
  question.children = question.children.filter((el) => el.code !== codes[1]);
  delete state[answerQualifiedCode];
  // could be otherText
  if (state.setup?.code?.includes(answerQualifiedCode)) {
    resetSetup(state);
  }
  state.index = buildCodeIndex(state);
  question.designErrors = questionDesignError(question);
  cleanupValidation(state, codes[0]);
  cleanupDefaultValue(question);
  refreshEnumForSingleChoice(question, state);
  refreshListForMultipleChoice(question, state);
  addMaskedValuesInstructions(codes[0], question, state);
  cleanupRandomRules(question);
  addSkipInstructions(state, codes[0]);
  resyncCarryForwardTargets(state, codes[0]);
}

export function addNewAnswers(state, payload) {
  const questionCode = payload.questionCode;
  const data = payload.data;
  const type = payload.type;
  let index = payload.index;
  const question = state[questionCode];
  const children =
    question.children?.filter((it) => state[it.qualifiedCode].type == type) ||
    [];
  data.forEach((item, itemIndex) => {
    if (item) {
      const nextAnswer = children[index + 1];
      if (
        nextAnswer &&
        nextAnswer.qualifiedCode &&
        state[nextAnswer.qualifiedCode]
      ) {
        changeContent(state, {
          code: nextAnswer.qualifiedCode,
          key: "label",
          value: item,
          lang: state.langInfo.lang,
        });
      } else if (state.designMode === DESIGN_SURVEY_MODE.DESIGN) {
        addNewAnswer(state, {
          questionCode,
          label: item,
          type,
          index,
          focus: itemIndex == data.length - 1,
        });
      }

      index++;
    }
  });
  resyncCarryForwardTargets(state, questionCode);
}

/** Replaces the question's answers of one type with one answer per label in `data`.
 * Does nothing once the survey is published: that would break collected responses. */
export function replaceAnswers(state, payload) {
  const { questionCode, type, data } = payload;
  if (state.versionDto?.published || (state.versionDto?.version ?? 0) > 1) {
    return;
  }
  (state[questionCode].children || [])
    .filter((child) => state[child.qualifiedCode].type == type)
    .forEach((child) => removeAnswer(state, child.qualifiedCode));
  addNewAnswers(state, { questionCode, type, index: -1, data });
}

export function onNewLine(state, payload) {
  const questionCode = payload.questionCode;
  const index = payload.index;
  const type = payload.type;
  const answers = state[questionCode].children || [];
  const nextAnswerOfSameType = answers.filter(
    (answer) => answer.type == type,
  )[index + 1];
  if (nextAnswerOfSameType && nextAnswerOfSameType.qualifiedCode) {
    state.focus = nextAnswerOfSameType.qualifiedCode;
  } else if (state.designMode === DESIGN_SURVEY_MODE.DESIGN) {
    addNewAnswer(state, {
      questionCode,
      type,
      index,
    });
  }
}

export function addNewAnswer(state, payload) {
  const questionCode = payload.questionCode;
  const type = payload.type;
  const index = payload.index;
  const focus = payload.focus || true;
  let label = payload.label;
  const answers = state[questionCode].children || [];
  let nextAnswerIndex = 1;
  let code = "";
  let qualifiedCode = "";
  switch (type) {
    case "column":
      nextAnswerIndex = nextId(answers.filter((el) => el.type === "column"));

      code = "Ac" + nextAnswerIndex;
      qualifiedCode = questionCode + code;
      addAnswer(state, { code, qualifiedCode, type, label, index });
      break;
    case "row":
      nextAnswerIndex = nextId(answers.filter((el) => el.type === "row"));
      code = "A" + nextAnswerIndex;
      qualifiedCode = questionCode + code;

      addAnswer(state, {
        code,
        qualifiedCode,
        type,
        label,
        index,
        focus,
      });
      break;
    case "other":
      code = "Aother";
      label = "Other";
      qualifiedCode = questionCode + code;
      addAnswer(state, {
        code,
        qualifiedCode,
        type,
        label,
        index,
        focus,
      });
      addAnswer(state, {
        code: "Atext",
        qualifiedCode: qualifiedCode + "Atext",
        type: "other_text",
        index,
      });
      break;

    case "all":
      code = "Aall";
      label = "All of the above";
      qualifiedCode = questionCode + code;
      addAnswer(state, {
        code,
        qualifiedCode,
        type,
        label,
        index,
        focus,
      });
      break;

    case "none":
      code = "Anone";
      label = "None of the above";
      qualifiedCode = questionCode + code;
      addAnswer(state, {
        code,
        qualifiedCode,
        type,
        label,
        index,
        focus,
      });
      break;
    default:
      nextAnswerIndex = nextId(answers);
      code = "A" + nextAnswerIndex;
      qualifiedCode = questionCode + code;
      addAnswer(state, {
        code,
        qualifiedCode,
        label,
        index,
        focus,
      });
      break;
  }
  resyncCarryForwardTargets(state, questionCode);
}

let carrySyncing = false;

export function enableCarryForward(state, payload) {
  const { targetCode, sourceCode } = payload;
  const target = state[targetCode];
  if (!target || !state[sourceCode] || targetCode === sourceCode) {
    return;
  }
  const axis = normalizeCarryAxis(state, targetCode, payload.axis);
  const mode = payload.mode === "unselected" ? "unselected" : "selected";
  if (!target.carryForward) {
    target.carryForward = {};
  }
  target.carryForward[axis] = {
    sourceCode,
    mode,
    // "Other" can only be carried in selected mode
    carryOther: mode === "selected" && !!payload.carryOther,
  };
  syncCarryForward(state, targetCode, axis);
  state.index = buildCodeIndex(state);
}

export function updateCarryForward(state, payload) {
  const { targetCode } = payload;
  const target = state[targetCode];
  const axis = normalizeCarryAxis(state, targetCode, payload.axis);
  const config = target?.carryForward?.[axis];
  if (!config) {
    return;
  }
  if (payload.sourceCode !== undefined && state[payload.sourceCode]) {
    config.sourceCode = payload.sourceCode;
  }
  if (payload.mode !== undefined) {
    config.mode = payload.mode === "unselected" ? "unselected" : "selected";
  }
  if (payload.carryOther !== undefined) {
    config.carryOther = !!payload.carryOther;
  }
  if (config.mode === "unselected") {
    config.carryOther = false;
  }
  syncCarryForward(state, targetCode, axis);
  state.index = buildCodeIndex(state);
}

export function disableCarryForward(state, payload) {
  const { targetCode } = payload;
  const target = state[targetCode];
  const axis = normalizeCarryAxis(state, targetCode, payload.axis);
  if (!target?.carryForward?.[axis]) {
    return;
  }
  delete target.carryForward[axis];
  if (Object.keys(target.carryForward).length === 0) {
    delete target.carryForward;
  }
  // Spec: options remain as an editable copy — we only stop syncing. Strip the
  // carry-owned relevance so the leftover options are truly plain/editable.
  (target.children || []).forEach((child) => {
    if (isCarriedChild(state, targetCode, axis, child)) {
      removeInstruction(state[child.qualifiedCode], "conditional_relevance");
    }
  });
  // Rebuild (or drop) the question-level hide from whatever axes remain carried.
  rebuildParentRelevance(state, targetCode);
  state.index = buildCodeIndex(state);
}

const CARRY_NON_CARRIED_SOURCE_TYPES = ["all", "none", "other_text", "other"];

// Non-array targets only ever use the "rows" slot.
const normalizeCarryAxis = (state, targetCode, axis) =>
  isArrayType(state[targetCode]?.type)
    ? axis === "columns"
      ? "columns"
      : "rows"
    : "rows";

// The child `type` carried options take on the target: rows/columns for arrays,
// undefined (plain option) for choice / ranking / text targets.
const carriedChildType = (state, targetCode, axis) =>
  isArrayType(state[targetCode]?.type)
    ? axis === "columns"
      ? "column"
      : "row"
    : undefined;

// Is this target child owned by the carry for the given axis? (Preserves the
// target's local "None of the above" and, on arrays, the untouched other axis.)
const isCarriedChild = (state, targetCode, axis, child) => {
  const t = state[child.qualifiedCode]?.type;
  if (isArrayType(state[targetCode]?.type)) {
    return t === carriedChildType(state, targetCode, axis);
  }
  return t !== "none"; // choice/ranking/text: everything but local None is carried
};

// The target's own child codes that are carry-driven for an axis (excludes the
// local "None", which never counts toward keeping the question visible).
const carriedCodesForAxis = (state, targetCode, axis) =>
  (state[targetCode].children || [])
    .filter((child) => isCarriedChild(state, targetCode, axis, child))
    .map((child) => child.code);

const rebuildParentRelevance = (state, targetCode) => {
  const target = state[targetCode];
  const cf = target?.carryForward;
  const children = cf
    ? ["rows", "columns"]
        .filter((axis) => cf[axis])
        .map((axis) => carriedCodesForAxis(state, targetCode, axis))
        .filter((group) => group.length)
    : [];
  if (children.length) {
    changeInstruction(target, { code: "parent_relevance", children });
  } else {
    removeInstruction(target, "parent_relevance");
  }
};

const sourceOtherOption = (state, sourceCode) =>
  (state[sourceCode]?.children || []).find(
    (c) => state[c.qualifiedCode]?.type === "other",
  );

// Regular (carryable) source options, in source order — excludes All / None /
// Other / other_text. Other is appended separately when eligible.
const carriedSourceOptions = (state, sourceCode) =>
  (state[sourceCode]?.children || []).filter(
    (c) =>
      CARRY_NON_CARRIED_SOURCE_TYPES.indexOf(state[c.qualifiedCode]?.type) ===
      -1,
  );

const carryRelevanceText = (config, optionCode, isOther) => {
  const src = config.sourceCode;
  const picked = (code) => `(${src}.value || []).indexOf('${code}') > -1`;
  if (isOther) {
    // carried only when the respondent picked Other in the source
    return picked("Aother");
  }
  return config.mode === "unselected"
    ? `!(${picked(optionCode)})`
    : picked(optionCode);
};

// Materialize one carried option as a target child (reusing the source code),
// mirroring its label across all languages and attaching the carry relevance.
// Returns the child entry (not yet placed in `target.children`).
const materializeCarriedOption = (
  state,
  targetCode,
  config,
  childType,
  srcChild,
  targetChildCode,
  ctx,
) => {
  // `targetChildCode` is the code the option takes on the target (usually the
  // source code, but remapped to the "Ac*" convention on the column axis — see
  // syncCarryForward). The runtime relevance keys off the SOURCE code
  // (srcChild.code), which is independent of the target child code.
  const code = targetChildCode;
  const qualifiedCode = targetCode + code;
  const srcState = state[srcChild.qualifiedCode];
  state[qualifiedCode] = {};
  if (childType) {
    state[qualifiedCode].type = childType;
  }
  // Regular options mirror the source label (a static copy, re-copied whenever
  // the source changes). The carried "Other" is the one exception: its label
  // pipes the respondent's typed write-in text from the source's Atext value,
  // rendered as a plain option (no write-in field on the target).
  const otherPipe = `{{${config.sourceCode}AotherAtext.value}}`;
  ctx.langs.forEach((lang) => {
    const label = ctx.isOther ? otherPipe : srcState?.content?.[lang]?.label;
    if (label !== undefined) {
      changeContent(state, { code: qualifiedCode, key: "label", value: label, lang });
    }
  });
  addAnswerInstructions(state, state[qualifiedCode], targetCode, targetCode);
  changeInstruction(state[qualifiedCode], {
    code: "conditional_relevance",
    text: carryRelevanceText(config, srcChild.code, ctx.isOther),
    isActive: true,
    returnType: "boolean",
  });
  return { code, qualifiedCode, ...(childType ? { type: childType } : {}) };
};

// Rebuild the target's carried options for one axis from the current source.
// Idempotent: safe to call after any source mutation.
const syncCarryForward = (state, targetCode, axis) => {
  const target = state[targetCode];
  const config = target?.carryForward?.[axis];
  if (!config) {
    return;
  }
  const source = state[config.sourceCode];
  const childType = carriedChildType(state, targetCode, axis);

  const wasSyncing = carrySyncing;
  carrySyncing = true;
  try {
    if (
      !source ||
      !source.children ||
      !CARRY_FORWARD_SOURCE_TYPES.includes(source.type)
    ) {
      target.designErrors = questionDesignError(target);
      return;
    }

    // Preserve the local "None" (choice targets) and the other axis (arrays);
    // wipe every currently-carried child and its state entry.
    const preserved = [];
    (target.children || []).forEach((child) => {
      if (isCarriedChild(state, targetCode, axis, child)) {
        delete state[child.qualifiedCode];
      } else {
        preserved.push(child);
      }
    });

    const ctx = {
      langs: (state.langInfo?.languagesList || []).map((l) => l.code),
    };

    // On the column axis, carried options can't keep the source "A*" codes —
    // they'd collide with the array's row codes (same qualifiedCode). Remap to
    // the native "Ac*" column convention; every other target keeps source codes
    // (the Data contract: target option codes = source option codes).
    const codeFor = (srcChild, ordinal) =>
      childType === "column" ? `Ac${ordinal + 1}` : srcChild.code;

    const carried = carriedSourceOptions(state, config.sourceCode).map(
      (srcChild, i) =>
        materializeCarriedOption(
          state,
          targetCode,
          config,
          childType,
          srcChild,
          codeFor(srcChild, i),
          { ...ctx, isOther: false },
        ),
    );

    // Other, last among carried options, only when eligible.
    const other = sourceOtherOption(state, config.sourceCode);
    if (config.carryOther && config.mode === "selected" && other) {
      carried.push(
        materializeCarriedOption(
          state,
          targetCode,
          config,
          childType,
          other,
          childType === "column" ? `Ac${carried.length + 1}` : "Aother",
          { ...ctx, isOther: true },
        ),
      );
    }

    // Canonical order: [preserved non-None] + carried options + [local None last].
    const noneChildren = preserved.filter(
      (c) => state[c.qualifiedCode]?.type === "none",
    );
    const otherPreserved = preserved.filter(
      (c) => state[c.qualifiedCode]?.type !== "none",
    );
    target.children = [...otherPreserved, ...carried, ...noneChildren];
    if (isArrayType(target.type)) {
      // columns must precede rows in the persisted order (see stableSortByAnswerType)
      target.children = stableSortByAnswerType(target.children);
    }

    target.designErrors = questionDesignError(target);
    cleanupValidation(state, targetCode);
    cleanupDefaultValue(target);
    refreshEnumForSingleChoice(target, state);
    refreshListForMultipleChoice(target, state);
    addMaskedValuesInstructions(targetCode, target, state);
    rebuildParentRelevance(state, targetCode);
  } finally {
    carrySyncing = wasSyncing;
  }
};

const resyncCarryForwardTargets = (state, changedCode) => {
  if (carrySyncing || !changedCode) {
    return;
  }
  const sourceQuestion = splitQuestionCodes(changedCode)[0];
  let touched = false;
  Object.keys(state).forEach((key) => {
    const comp = state[key];
    if (!comp || typeof comp !== "object" || !comp.carryForward) {
      return;
    }
    ["rows", "columns"].forEach((axis) => {
      if (comp.carryForward[axis]?.sourceCode === sourceQuestion) {
        syncCarryForward(state, key, axis);
        touched = true;
      }
    });
  });
  if (touched) {
    state.index = buildCodeIndex(state);
  }
};

// Severs every carry-forward link that pointed at `sourceCode`, turning each
// target's mirrored options into a plain, editable copy (via disableCarryForward).
// Used when the source can no longer be a carry source (e.g. its type changed to
// a non-multiple-choice type): the setup panel already hides such a source, so a
// surviving config would be an invisible, unmanageable link that keeps mirroring.
const severCarryForwardTargets = (state, sourceCode) => {
  Object.keys(state).forEach((key) => {
    const comp = state[key];
    if (!comp || typeof comp !== "object" || !comp.carryForward) {
      return;
    }
    // disableCarryForward may delete comp.carryForward once its last axis goes,
    // so re-check it each iteration.
    ["rows", "columns"].forEach((axis) => {
      if (comp.carryForward?.[axis]?.sourceCode === sourceCode) {
        disableCarryForward(state, { targetCode: key, axis });
      }
    });
  });
};


export function deleteGroup(state, payload) {
  const groupCode = payload;
  if (state.setup?.code == groupCode) {
    resetSetup(state);
  }
  if (state[groupCode].groupType == "END") {
    state.error = {
      message: "There must always be an end group. for an end message ",
    };
    return;
  }
  const survey = state.Survey;
  const index = survey.children?.findIndex((x) => x.code === groupCode);
  survey.children.splice(index, 1);
  delete state[groupCode];
  cleanupRandomRules(survey);
  cleanupSkipDestinations(state, groupCode);
}

export function deleteQuestion(state, payload) {
  const questionCode = payload;
  if (state.setup?.code == questionCode) {
    resetSetup(state);
  }
  const survey = state.Survey;
  const group = survey.children
    ?.map((group) => state[group.code])
    ?.filter(
      (group) =>
        group.children &&
        group.children.findIndex((child) => child.code == questionCode) !== -1,
    )?.[0];
  if (!group) {
    return;
  }
  const questionIndex = group.children.findIndex((x) => x.code === questionCode);
  let children = [...group.children];
  if (children.length === 1) {
    group.children = [];
  } else {
    group.children.splice(questionIndex, 1);
  }
  delete state[questionCode];
  cleanupRandomRules(group);
  cleanupSkipDestinations(state, questionCode);
  resyncCarryForwardTargets(state, questionCode);
}

export function convertQuestion(state, payload) {
  const { questionCode, newType } = payload;

  const currentQuestion = state[questionCode];
  if (!currentQuestion) return;
  const currentType = currentQuestion.type;

  const inChoiceGroup =
    CONVERTIBLE_CHOICE_TYPES.includes(currentType) &&
    CONVERTIBLE_CHOICE_TYPES.includes(newType);
  const inArrayGroup =
    CONVERTIBLE_ARRAY_TYPES.includes(currentType) &&
    CONVERTIBLE_ARRAY_TYPES.includes(newType);
  const inTextGroup =
    CONVERTIBLE_TEXT_TYPES.includes(currentType) &&
    CONVERTIBLE_TEXT_TYPES.includes(newType);
  const inDateTimeGroup =
    CONVERTIBLE_DATE_TIME_TYPES.includes(currentType) &&
    CONVERTIBLE_DATE_TIME_TYPES.includes(newType);
  if (
    (!inChoiceGroup && !inArrayGroup && !inTextGroup && !inDateTimeGroup) ||
    currentType === newType
  )
    return;

  // Update type in question state
  currentQuestion.type = newType;

  // Update type in the group children entry
  const survey = state.Survey;
  survey.children.forEach((g) => {
    const group = state[g.code];
    const child = group.children?.find((c) => c.code === questionCode);
    if (child) child.type = newType;
  });

  if (inChoiceGroup) {
    convertChoiceQuestion(
      state,
      questionCode,
      currentQuestion,
      currentType,
      newType,
    );
  } else if (inArrayGroup) {
    convertArrayQuestion(
      state,
      questionCode,
      currentQuestion,
      currentType,
      newType,
    );
  } else if (inTextGroup) {
    convertTextQuestion(currentQuestion, newType);
  } else if (inDateTimeGroup) {
    convertDateTimeQuestion(currentQuestion, currentType, newType);
    addMaskedValuesInstructions(questionCode, currentQuestion, state);
  }

  cleanupValidation(state, questionCode);
  currentQuestion.designErrors = questionDesignError(currentQuestion);
  setup(state, { code: questionCode, rules: setupOptions(newType) });
  // A source converted to a type that can't feed carry forward must not keep
  // silently mirroring into its targets; sever the links so their options stay
  // as a plain editable copy. Otherwise resync every still-valid target.
  if (!CARRY_FORWARD_SOURCE_TYPES.includes(newType)) {
    severCarryForwardTargets(state, questionCode);
  }
  resyncCarryForwardTargets(state, questionCode);
}

export function changeContent(state, payload) {
  if (!state[payload.code].content) {
    state[payload.code].content = {};
    state[payload.code].content[payload.lang] = {};
  } else if (!state[payload.code].content[payload.lang]) {
    state[payload.code].content[payload.lang] = {};
  }
  const prefixToRemove = `format_${payload.key}_${payload.lang}`;
  const toRemove = state[payload.code].instructionList?.filter((instruction) =>
    instruction.code.startsWith(prefixToRemove),
  );
  toRemove?.forEach((instruction) => {
    changeInstruction(state[payload.code], {
      code: instruction.code,
      remove: true,
    });
  });

  state[payload.code].instructionList = state[
    payload.code
  ].instructionList?.filter(
    (instruction) => !instruction.code.startsWith(prefixToRemove),
  );
  const referenceInstructions = buildFormatInstruction(
    payload.value,
    payload.key,
    payload.lang,
    ["content", payload.lang, payload.key],
  );
  referenceInstructions?.forEach((instruction) =>
    changeInstruction(state[payload.code], instruction),
  );

  saveContentResources(
    state[payload.code],
    payload.value,
    payload.lang,
    payload.key,
  );

  state[payload.code].content[payload.lang][payload.key] = payload.value;
  resyncCarryForwardTargets(state, payload.code);
}

export function changeCustomCss(state, payload) {
  const referenceInstructions = buildFormatInstruction(
    payload.value,
    "custom",
    "css",
    ["customCss"],
  );
  state[payload.code].customCss = payload.value;
  referenceInstructions?.forEach((instruction) =>
    changeInstruction(state[payload.code], instruction),
  );
}

export function changeResources(state, payload) {
  if (!state[payload.code].resources) {
    state[payload.code].resources = {};
  }
  state[payload.code].resources[payload.key] = payload.value;
}

export function updateRandom(state, payload) {
  const componentState = state[payload.code];
  if (payload.groups) {
    const instruction = { code: "random_group", groups: payload.groups };
    changeInstruction(componentState, instruction);
  } else {
    removeInstruction(componentState, "random_group");
  }
}

export function updateRandomByType(state, payload) {
  const componentState = state[payload.code];
  const otherChildrenCodes = state[payload.code]?.children
    ?.filter((el) => el.type !== payload.type)
    ?.map((el) => el.code);
  const randomInstruction = instructionByCode(componentState, "random_group");
  const otherRandomOrders =
    randomInstruction?.groups?.filter(
      (x) => x.length && x.some((elem) => otherChildrenCodes.includes(elem)),
    ) || [];
  const groups = payload.groups.concat(otherRandomOrders);
  if (groups) {
    const instruction = { code: "random_group", groups };
    changeInstruction(componentState, instruction);
  } else {
    removeInstruction(componentState, "random_group");
  }
}

export function updatePriority(state, payload) {
  const componentState = state[payload.code];
  if (payload.priorities && payload.priorities.length) {
    const instruction = {
      code: "priority_groups",
      priorities: payload.priorities,
    };
    changeInstruction(componentState, instruction);
  } else {
    removeInstruction(componentState, "priority_groups");
  }
}

// === SKIP LOGIC ===
export function addSkipRule(state, payload) {
  const { code } = payload;
  if (!state[code].skip_logic) {
    state[code].skip_logic = [];
  }
  state[code].skip_logic.push({ condition: [], skipTo: null });
}

export function updateSkipRule(state, payload) {
  const { code, ruleIndex, updates } = payload;
  const rule = state[code].skip_logic[ruleIndex];
  Object.assign(rule, updates);
  // Reset toEnd/disqualify if destination is not a group
  if (updates.skipTo && !updates.skipTo.startsWith("G")) {
    rule.toEnd = false;
    rule.disqualify = false;
  }
  addSkipInstructions(state, code);
}

export function removeSkipRule(state, payload) {
  const { code, ruleIndex } = payload;
  state[code].skip_logic.splice(ruleIndex, 1);
  addSkipInstructions(state, code);
}

export function addCustomValidationRule(state, payload) {
  const { code } = payload;

  const numbers = (state[code].instructionList || [])
    .map((i) => i.code.match(/^validation_custom_(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);

  const newRuleCode = `validation_custom_${Math.max(0, ...numbers) + 1}`;

  changeInstruction(state[code], {
    code: newRuleCode,
    text: "",
    returnType: "boolean",
    isActive: true,
  });
}

export function updateCustomValidationRuleText(state, payload) {
  const { code, ruleCode, text } = payload;
  state[code].instructionList.find((i) => i.code === ruleCode).text = text;
}

export function renameCustomValidationRule(state, payload) {
  const { code, ruleCode, newCode } = payload;
  const instruction = state[code].instructionList.find(
    (i) => i.code === ruleCode,
  );
  instruction.code = newCode;
  const content = state[code].content || {};
  Object.keys(content).forEach((lang) => {
    if (content[lang][ruleCode] !== undefined) {
      content[lang][newCode] = content[lang][ruleCode];
      delete content[lang][ruleCode];
    }
  });
}

export function updateCustomValidationRuleError(state, payload) {
  const { code, ruleCode, lang, value } = payload;
  if (!state[code].content) {
    state[code].content = {};
  }
  if (!state[code].content[lang]) {
    state[code].content[lang] = {};
  }
  if (value) {
    state[code].content[lang][ruleCode] = value;
  } else {
    delete state[code].content[lang][ruleCode];
  }
}

export function removeCustomValidationRule(state, payload) {
  const { code, ruleCode } = payload;

  changeInstruction(state[code], { code: ruleCode, remove: true });

  const content = state[code].content || {};
  Object.keys(content).forEach((lang) => {
    delete content[lang][ruleCode];
  });
}

export function updateInstruction(state, payload) {
  const { code, instruction } = payload;

  if (!state[code]) {
    return;
  }

  changeInstruction(state[code], instruction);
}

export function onBaseLangChanged(state, payload) {
  state.langInfo.mainLang = payload.code;
  state.Survey.defaultLang = payload;
  state.Survey.additionalLang = state.Survey.additionalLang?.filter(
    (language) => language.code !== payload.code,
  );
  state.langInfo.lang = payload.code;
  state.langInfo.onMainLang = true;
  state.langInfo.languagesList = [payload].concat(
    state.Survey.additionalLang || [],
  );
}

export function onAdditionalLangAdded(state, payload) {
  state.Survey.additionalLang = (state.Survey.additionalLang || []).concat(
    payload,
  );
  state.langInfo.languagesList = [state.Survey.defaultLang].concat(
    state.Survey.additionalLang || [],
  );
}

export function onAdditionalLangRemoved(state, payload) {
  state.Survey.additionalLang = state.Survey.additionalLang.filter(
    (language) => language.code !== payload.code,
  );
  state.langInfo.languagesList = [state.Survey.defaultLang].concat(
    state.Survey.additionalLang || [],
  );
}

export function changeLang(state, payload) {
  state.langInfo.lang = payload;
  state.langInfo.onMainLang = state.langInfo.lang == state.langInfo.mainLang;
}

export function resetFocus(state) {
  state.focus = null;
}

export function setSaving(state, payload) {
  state.isSaving = payload;
}

export function refreshDsl(state) {
  const survey = state.Survey;
  if (!survey?.children) {
    return;
  }

  survey.children.forEach((group) => {
    const groupObj = state[group.code];

    cleanupFormatInstructions(groupObj);

    groupObj.children?.forEach((questionChild) => {
      const questionCode = questionChild.code;
      const question = state[questionCode];
      if (!question) {
        return;
      }

      addQuestionValueInstruction(question);
      cleanupFormatInstructions(question);

      question.children?.forEach((element) => {
        addAnswerInstructions(
          state,
          state[element.qualifiedCode],
          questionCode,
          questionCode,
        );
        cleanupFormatInstructions(state[element.qualifiedCode]);
      });

      cleanupValidation(state, questionCode);
      cleanupDefaultValue(question);
      refreshEnumForSingleChoice(question, state);
      refreshListForMultipleChoice(question, state);
      addMaskedValuesInstructions(questionCode, question, state);
    });
  });
}

export function setUpdating(state, payload) {
  state.isUpdating = payload;
}

export function onDrag(state, payload) {
  state.skipScroll = true;

  switch (payload.type) {
    case "reorder_questions":
      reorderQuestions(state, state.Survey, payload);
      state.index = buildCodeIndex(state);
      break;
    case "reparent_question":
      reparentQuestion(state, state.Survey, payload);
      state.index = buildCodeIndex(state);
      break;
    case "reorder_groups":
      reorderGroups(state.Survey, payload);
      state.index = buildCodeIndex(state);
      state.skipScroll = false;
      state.lastAddedComponent = { type: "group", index: payload.toIndex };
      break;
    case "reorder_answers":
      reorderAnswers(state, payload);
      resyncCarryForwardTargets(state, payload.id);
      break;
    case "reorder_answers_by_type":
      reorderAnswersByType(state, payload);
      resyncCarryForwardTargets(state, payload.id);
      break;
    case "new_question":
      newQuestion(state, payload);
      state.index = buildCodeIndex(state);
      break;
    case "new_group":
      if (payload.groupType == "group") {
        newGroup(state, payload);
        state.index = buildCodeIndex(state);
      } else if (
        payload.groupType == "end" ||
        payload.groupType == "welcome"
      ) {
        specialGroup(state, payload);
      }
      break;
  }
}

export function addComponent(state, payload) {
  const { type, questionType } = payload;
  const survey = state.Survey;
  state.skipScroll = false;

  if (type === "group") {
    const lastGroupIndex = Math.max(0, survey.children.length - 1);
    newGroup(state, { toIndex: lastGroupIndex });
  } else if (type === "question") {
    if (state.Survey.children.length == 1) {
      newGroup(state, { toIndex: 0 });
    }
    const lastGroupIndex = Math.max(0, survey.children.length - 2);
    const destinationGroupCode = survey.children[lastGroupIndex].code;
    const destinationGroup = state[destinationGroupCode];
    const toIndex = destinationGroup.children?.length || 0;
    newQuestion(state, {
      destination: destinationGroupCode,
      questionType,
      toIndex,
    });
  }
  state.index = buildCodeIndex(state);
}

// ===========================================================================
// Internal helpers (not part of the mutation reducer surface)
// ===========================================================================

const cleanupRandomRules = (componentState) => {
  if (componentState["randomize_questions"]) {
    updateRandomByRule(componentState, "randomize_questions");
  } else if (componentState["randomize_groups"]) {
    updateRandomByRule(componentState, "randomize_groups");
  } else if (componentState["randomize_options"]) {
    updateRandomByRule(componentState, "randomize_options");
  } else if (componentState["randomize_rows"]) {
    updateRandomByRule(componentState, "randomize_rows");
  } else if (componentState["randomize_columns"]) {
    updateRandomByRule(componentState, "randomize_columns");
  }
  cleanupPriorityRules(componentState);
};

const cleanupPriorityRules = (componentState) => {
  // an array question can have both rows and columns prioritised at once, so
  // clean every active rule (not else-if) to prune stale codes from each axis
  [
    "prioritise_questions",
    "prioritise_groups",
    "prioritise_options",
    "prioritise_rows",
    "prioritise_columns",
  ].forEach((rule) => {
    if (componentState[rule]) {
      updatePriorityByRule(componentState, rule);
    }
  });
};

const cleanupFormatInstructions = (componentState) => {
  const prefixToRemove = `format_`;
  const toRemove = componentState.instructionList?.filter((instruction) =>
    instruction.code.startsWith(prefixToRemove),
  );
  toRemove?.forEach((instruction) => {
    changeInstruction(componentState, {
      code: instruction.code,
      remove: true,
    });
  });
  if (componentState.customCss) {
    const referenceInstructions = buildFormatInstruction(
      componentState.customCss,
      "custom",
      "css",
      ["customCss"],
    );
    referenceInstructions?.forEach((instruction) =>
      changeInstruction(componentState, instruction),
    );
  }
  if (componentState.content) {
    Object.keys(componentState.content).forEach((lang) => {
      Object.keys(componentState.content[lang]).forEach((key) => {
        const referenceInstructions = buildFormatInstruction(
          componentState.content[lang][key],
          key,
          lang,
          ["content", lang, key],
        );
        referenceInstructions?.forEach((instruction) =>
          changeInstruction(componentState, instruction),
        );
      });
    });
  }
};

// Clean up skip_logic rules that point to a deleted destination
const cleanupSkipDestinations = (state, deletedCode) => {
  Object.keys(state).forEach((key) => {
    const component = state[key];
    if (Array.isArray(component?.skip_logic)) {
      const hadRules = component.skip_logic.some(
        (rule) => rule.skipTo === deletedCode,
      );
      if (hadRules) {
        component.skip_logic = component.skip_logic.filter(
          (rule) => rule.skipTo !== deletedCode,
        );
        addSkipInstructions(state, key);
      }
    }
  });
};

const saveContentResources = (
  component,
  contentValue,
  contentLang,
  contentKey,
) => {
  const regex = /data-resource-name="([^"]+)"/g;
  const resources = Array.from(
    contentValue.matchAll(regex),
    (match) => match[1],
  ).filter((name) => name && name.trim());

  if (!component.resources) {
    component.resources = {};
  }
  // Remove existing items with matching keys
  const prefix = `content_${contentLang}_${contentKey}`;
  Object.keys(component.resources).forEach((key) => {
    if (key.startsWith(prefix)) {
      delete component.resources[key];
    }
  });
  resources.forEach((elem, index) => {
    component.resources[`${prefix}_${index + 1}`] = elem;
  });
};

const reparentQuestion = (state, survey, payload) => {
  let index = buildIndex(state);
  const sourceGroup = state[payload.source];
  const destinationGroup = state[payload.destination];
  const sourceQuestionIndex = sourceGroup.children.findIndex(
    (question) => question.code == payload.id,
  );
  const destinationQuestionIndex =
    index.indexOf(payload.destination) > index.indexOf(payload.source)
      ? 0
      : destinationGroup.children?.length || 0;
  const question = sourceGroup.children[sourceQuestionIndex];
  if (!question) {
    return;
  }
  sourceGroup.children.splice(sourceQuestionIndex, 1);
  if (!destinationGroup.children) {
    destinationGroup.children = [];
  }
  destinationGroup.children.splice(destinationQuestionIndex, 0, question);
  // cheap trick to notifiy Drop Areas of the update
  state["reorder_refresh_code"] = Math.floor(Math.random() * 1000000);
  cleanupRandomRules(destinationGroup);
  cleanupRandomRules(sourceGroup);
};

const reorderQuestions = (state, survey, payload) => {
  const sourceGroup = state[payload.source];
  const destinationGroup = state[payload.destination];
  const sourceQuestionIndex = sourceGroup.children.findIndex(
    (question) => question.code == payload.id,
  );
  const destinationQuestionIndex = payload.toIndex - 1;
  const question = sourceGroup.children[sourceQuestionIndex];
  sourceGroup.children.splice(sourceQuestionIndex, 1);
  if (!destinationGroup.children) {
    destinationGroup.children = [];
  }
  destinationGroup.children.splice(destinationQuestionIndex, 0, question);
  // cheap trick to notifiy Drop Areas of the update
  state["reorder_refresh_code"] = Math.floor(Math.random() * 1000000);
  cleanupRandomRules(destinationGroup);
  cleanupRandomRules(sourceGroup);
};

const newQuestion = (state, payload) => {
  const survey = state.Survey;
  let questionId = nextQuestionId(state, survey.children);
  const questionObject: any = createQuestion(
    payload.questionType,
    questionId,
    state.langInfo.mainLang,
  );
  const destinationGroup = state[payload.destination];
  const destinationQuestionIndex = payload.toIndex;
  if (!destinationGroup.children) {
    destinationGroup.children = [];
  }

  Object.keys(questionObject)
    .filter((key) => key != "question")
    .forEach((key) => {
      state[key] = questionObject[key];
    });
  const newCode = `Q${questionId}`;
  addQuestionValueInstruction(state[newCode]);
  state[newCode].children?.forEach((element) => {
    addAnswerInstructions(state, state[element.qualifiedCode], newCode, newCode);
  });
  cleanupValidation(state, newCode);
  cleanupDefaultValue(questionObject[newCode]);
  refreshEnumForSingleChoice(questionObject[newCode], state);
  refreshListForMultipleChoice(questionObject[newCode], state);
  addMaskedValuesInstructions(newCode, questionObject[newCode], state);
  destinationGroup.children.splice(
    destinationQuestionIndex,
    0,
    questionObject.question,
  );

  const groupIndex = survey.children.findIndex(
    (group) => group.code === payload.destination,
  );
  state.lastAddedComponent = {
    type: "question",
    groupIndex: groupIndex,
    questionIndex: destinationQuestionIndex,
  };
  cleanupRandomRules(destinationGroup);
  state.focus = newCode;
  setup(state, {
    code: newCode,
    rules: setupOptions(payload.questionType),
  });
};

const newGroup = (state, payload) => {
  const survey = state.Survey;
  const group = createGroup("GROUP", nextGroupId(survey.children));
  if (!survey.children) {
    survey.children = [];
  }
  if (payload.toIndex == -1) {
    survey.children.push(group.newGroup);
  } else {
    survey.children.splice(payload.toIndex, 0, group.newGroup);
  }
  state[group.newGroup.code] = group.state;

  const lastGroupIndex = survey.children.findIndex(
    (child) => child.code === group.newGroup.code,
  );
  state.lastAddedComponent = {
    type: "group",
    index: lastGroupIndex,
  };
  cleanupRandomRules(survey);
  state.focus = group.newGroup.code;
  setup(state, {
    code: group.newGroup.code,
    rules: setupOptions(group.newGroup.type),
  });
};

const specialGroup = (state, payload) => {
  const survey = state.Survey;
  if (!survey.children) {
    survey.children = [];
  }
  const index = survey.children.findIndex(
    (group) => state[group.code].groupType?.toLowerCase() === payload.groupType,
  );
  if (index !== -1) {
    state.error = {
      message:
        "cannot have duplicate " +
        (payload.groupType == "welcome" ? "Welcome groups" : "End groups"),
    };
    return;
  }
  if (payload.groupType == "welcome") {
    const group = createGroup("WELCOME", nextGroupId(survey.children));
    survey.children.splice(0, 0, group.newGroup);
    state[group.newGroup.code] = group.state;
    setup(state, {
      code: group.newGroup.code,
      rules: setupOptions(group.newGroup.type),
    });
  } else if (payload.groupType == "end") {
    const group = createGroup("END", nextGroupId(survey.children));
    survey.children.push(group.newGroup);
    state[group.newGroup.code] = group.state;
    setup(state, {
      code: group.newGroup.code,
      rules: setupOptions(group.newGroup.type),
    });
  }
};

const addAnswer = (state, answer) => {
  const lang = state.langInfo.mainLang;
  const label = answer.label;
  const qualifiedCode = answer.qualifiedCode;
  state[qualifiedCode] = {};
  const codes = splitQuestionCodes(qualifiedCode);
  const parentCode = codes.slice(0, codes.length - 1).join("");
  const questionCode = codes[0];
  if (!insertAnswer(state, answer, parentCode, answer.index)) {
    return;
  }
  if (label) {
    state[qualifiedCode].content = { [lang]: { label: label } };
  }
  if (answer.type) {
    state[qualifiedCode].type = answer.type;
  }
  addAnswerInstructions(state, state[qualifiedCode], parentCode, questionCode);
  cleanupDefaultValue(state[questionCode]);
  refreshEnumForSingleChoice(state[questionCode], state);
  refreshListForMultipleChoice(state[questionCode], state);
  if (answer.focus) {
    state.focus = qualifiedCode;
  }
};

const reorderGroups = (survey, payload) => {
  survey.children = reorder(survey.children, payload.fromIndex, payload.toIndex);
};
const reorderAnswers = (state, payload) => {
  const codes = splitQuestionCodes(payload.id);
  const parentCode = codes.slice(0, codes.length - 1).join("");
  const component = state[parentCode];
  component.children = reorder(
    component.children,
    payload.fromIndex,
    payload.toIndex,
  );
};
const reorderAnswersByType = (state, payload) => {
  const codes = splitQuestionCodes(payload.id);
  const parentCode = codes.slice(0, codes.length - 1).join("");
  const component = state[parentCode];
  const type = state[payload.id].type;
  const filteredChildren = component.children.filter(
    (child) => child.type == type,
  );
  const fromIndex = component.children.indexOf(
    filteredChildren[payload.fromIndex],
  );
  const toIndex = component.children.indexOf(filteredChildren[payload.toIndex]);
  component.children = reorder(component.children, fromIndex, toIndex);
};

const ARRAY_ANSWER_TYPE_ORDER = { column: 0, row: 1 };

// Array question children are read as a flat, ordered list by the survey
// engine, so "row" answers referencing a "column" answer's `.label` that
// comes later in that list trip the engine's ForwardDependency check. A
// stable sort keeps each type's relative order (drag-and-drop reordering
// within a type still works) while guaranteeing columns always come first.
const stableSortByAnswerType = (children) =>
  [...children].sort(
    (a, b) =>
      (ARRAY_ANSWER_TYPE_ORDER[a.type] ?? 0) -
      (ARRAY_ANSWER_TYPE_ORDER[b.type] ?? 0),
  );

const insertAnswer = (state, answer, parentCode, index) => {
  const component = state[parentCode];
  if (component) {
    if (!component.children) {
      component.children = [];
    }
    const insertIndex =
      typeof index == "number"
        ? typeof answer.type == "string"
          ? index +
            firstIndexInArray(
              component.children,
              (child) => child.type == answer.type,
            )
          : index
        : lastIndexInArray(
            component.children,
            (child) => child.type == answer.type || !child.type,
          );
    component.children.splice(insertIndex + 1, 0, answer);
    if (CONVERTIBLE_ARRAY_TYPES.includes(component.type)) {
      // Columns must precede rows in the persisted order: each row's
      // auto-generated masked_value instruction references every column's
      // `.label`, and the engine flags that as a ForwardDependency (silently
      // dropping the instruction) when a column sits after the row in the
      // component tree.
      component.children = stableSortByAnswerType(component.children);
    }
    component.designErrors = questionDesignError(component);
    cleanupValidation(state, parentCode);
    addMaskedValuesInstructions(parentCode, component, state);
    cleanupRandomRules(component);
    return true;
  } else {
    return false;
  }
};

const buildIndex = (state) => {
  let retrunRestult = [];
  state.Survey.children?.forEach((group) => {
    retrunRestult.push(group.code);
    let groupObj = state[group.code];
    if (groupObj.children && !groupObj.collapsed) {
      groupObj.children.forEach((question) => {
        if (question?.code) {
          retrunRestult.push(question.code);
        }
      });
    }
  });
  return retrunRestult;
};

const splitQuestionCodes = (code) => {
  return code.split(/(A[a-z_0-9]+|Q[a-z_0-9]+)/).filter(Boolean);
};

const cleanupValidation = (state, code) => {
  const component = state[code];
  if (!component.validation) {
    return;
  }
  const ruleKeys = Object.keys(component["validation"]);
  ruleKeys.forEach((key) => processValidation(state, code, key, true));
};

const addRelevanceInstructions = (state, code, relevance) => {
  const instruction = conditionalRelevanceEquation(
    relevance.logic,
    relevance.rule,
    state,
  );
  changeInstruction(state[code], instruction);
};

export const mapCodeToUserFriendlyOrder = (code, index) => {
  // `code` is a string; the previous cloneDeep was a no-op.
  let newCode = code;
  // Pattern for G followed by alphanumeric characters
  const gPattern = /G[a-zA-Z0-9]+/g;

  // Pattern for Q followed by alphanumeric characters
  const qPattern = /Q[a-zA-Z0-9]+/g;

  // Find all G matches
  const gMatches = code.match(gPattern);
  if (gMatches) {
    gMatches.forEach((match) => {
      newCode = newCode.replace(match, index[match]);
    });
  }

  // Find all Q matches
  const qMatches = code.match(qPattern);
  if (qMatches) {
    qMatches.forEach((match) => {
      newCode = newCode.replace(match, index[match]);
    });
  }
  // Return counts for reference
  return newCode;
};

const creatNewState = (
  state,
  toBeCopied,
  newStateCode,
  oldQuestionCode,
  newQuestionCode,
) => {
  // NB: `toBeCopied` is an immer draft (a Proxy) on the frontend, and
  // structuredClone throws DataCloneError on proxies. A JSON round-trip reads
  // through the proxy and matches the JSON-only survey DSL (backend / AI pass a
  // plain object, so it works there too).
  const newState = JSON.parse(JSON.stringify(toBeCopied));
  if (newState.relevance) {
    delete newState.relevance;
    const index = newState.instructionList?.findIndex(
      (instruction) => instruction.code == "conditional_relevance",
    );
    if (index) {
      newState.instructionList?.splice(index, 1);
    }
  }
  if (newState.skip_logic) {
    delete newState.skip_logic;
    newState.instructionList = newState.instructionList.filter(
      (eq) => !eq.code.startsWith("skip_to_on_"),
    );
  }
  newState.instructionList?.forEach((eq) => {
    eq.text = eq.text?.replaceAll(oldQuestionCode, newQuestionCode);
  });
  state[newStateCode] = newState;
  state[newStateCode]?.children?.forEach((child) => {
    let oldChildCode = child.qualifiedCode;
    let newChildCode = child.qualifiedCode.replaceAll(
      oldQuestionCode,
      newQuestionCode,
    );
    child.qualifiedCode = newChildCode;
    creatNewState(
      state,
      state[oldChildCode],
      newChildCode,
      oldQuestionCode,
      newQuestionCode,
    );
  });
};
