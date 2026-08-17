import { createSlice, current } from "@reduxjs/toolkit";
import { firstIndexInArray, isEquivalent, nextId } from "~/utils/design/utils";
import { createGroup } from "~/components/design/NewComponentsPanel";

import { lastIndexInArray } from "~/utils/design/utils";
import cloneDeep from "lodash.clonedeep";
import {
  buildValidationDefaultData,
  nextGroupId,
  nextQuestionId,
  reorder,
  buildFormatInstruction,
} from "./stateUtils";
import {
  CONVERTIBLE_CHOICE_TYPES,
  CONVERTIBLE_ARRAY_TYPES,
  CONVERTIBLE_TEXT_TYPES,
  CONVERTIBLE_DATE_TIME_TYPES,
  languageSetup,
  setupOptions,
  themeSetup,
} from "~/constants/design";
import { convertChoiceQuestion } from "./convertChoiceQuestion";
import { convertArrayQuestion } from "./convertArrayQuestion";
import { convertTextQuestion } from "./convertTextQuestion";
import { convertDateTimeQuestion } from "./convertDateTimeQuestion";
import {
  createQuestion,
  questionDesignError,
} from "~/components/Questions/utils";
import { DESIGN_SURVEY_MODE } from "~/routes";
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
  removeInstruction,
  updateRandomByRule,
  updatePriorityByRule,
} from "./addInstructions";
import { defaultSurveyTheme } from "~/constants/theme";

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
];

export const designState = createSlice({
  name: "designState",
  initialState: { state: {} },
  reducers: {
    designStateReceived: (state, action) => {
      const response = action.payload;
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
    },
    setup(state, action) {
      const payload = action.payload;
      // we want to ignore multiple clicks on the same setup button
      // but acknowledge when we highlight or expand a specific section
      if (
        payload.code != state.setup?.code ||
        !isEquivalent(payload.rules, state.setup?.rules) ||
        payload.highlighted
      ) {
        state.setup = action.payload;
      }
    },
    clearHighlighted(state) {
      if (state.setup) {
        delete state.setup.highlighted;
      }
    },
    setShowAdvanced(state, action) {
      const { code, value } = action.payload;
      if (!state.advancedByCode) state.advancedByCode = {};
      state.advancedByCode[code] = value;
    },
    newVersionReceived(state, action) {
      const payload = action.payload;
      state.versionDto = payload;
    },
    changeValidationValue(state, action) {
      let payload = action.payload;
      if (!state[payload.code]["validation"]) {
        state[payload.code]["validation"] = {};
      }
      if (!state[payload.code]["validation"][payload.rule]) {
        state[payload.code]["validation"][payload.rule] =
          buildValidationDefaultData(payload.rule);
      }
      state[payload.code]["validation"][payload.rule][payload.key] =
        payload.value;
      processValidation(
        state,
        payload.code,
        payload.rule,
        payload.rule != "content",
      );
    },
    resetSetup(state) {
      if (state.langInfo) {
        state.langInfo.lang = state.langInfo.mainLang;
        state.langInfo.onMainLang = true;
      }
      if (!state.globalSetup) {
        state.globalSetup = {};
      }
      delete state["setup"];
    },
    setDesignModeToDesign(state) {
      designState.caseReducers.resetSetup(state);
      state.designMode = DESIGN_SURVEY_MODE.DESIGN;
    },
    setDesignModeToLang(state) {
      designState.caseReducers.resetSetup(state);
      designState.caseReducers.setup(state, { payload: languageSetup });
      state.designMode = DESIGN_SURVEY_MODE.LANGUAGES;
    },
    setDesignModeToTheme(state) {
      designState.caseReducers.resetSetup(state);
      designState.caseReducers.setup(state, { payload: themeSetup });
      state.designMode = DESIGN_SURVEY_MODE.THEME;
    },
    changeAttribute: (state, action) => {
      let payload = action.payload;
      if (
        action.payload.key == "content" ||
        action.payload.key == "instructionList" ||
        action.payload.key == "relevance" ||
        action.payload.key == "resources"
      ) {
        throw "We are changing attributes way too much than we should";
      }
      if (!state[payload.code]) {
        state[payload.code] = {};
      }
      const originalValue = state[payload.code][payload.key];

      state[payload.code][payload.key] = payload.value;
      if (action.payload.key == "maxChars") {
        cleanupValidation(state, payload.code);
      } else if (action.payload.key == "dateFormat") {
        addMaskedValuesInstructions(payload.code, state[payload.code], state);
      } else if (action.payload.key == "fullDayFormat") {
        addMaskedValuesInstructions(payload.code, state[payload.code], state);
      } else if (action.payload.key == "decimal_separator") {
        addMaskedValuesInstructions(payload.code, state[payload.code], state);
      } else if (
        [
          "randomize_questions",
          "randomize_groups",
          "randomize_options",
          "randomize_rows",
          "randomize_columns",
        ].indexOf(action.payload.key) > -1
      ) {
        updateRandomByRule(
          state[payload.code],
          action.payload.key,
          !originalValue || originalValue == "NONE",
        );
      } else if (
        [
          "prioritise_questions",
          "prioritise_groups",
          "prioritise_options",
          "prioritise_rows",
          "prioritise_columns",
        ].indexOf(action.payload.key) > -1
      ) {
        updatePriorityByRule(
          state[payload.code],
          action.payload.key,
          !originalValue || originalValue == "NONE",
        );
      }
    },
    changeRelevance: (state, action) => {
      let payload = action.payload;
      state[payload.code].relevance = payload.value;
      addRelevanceInstructions(state, payload.code, payload.value);
    },
    clearRelevanceConfig: (state, action) => {
      delete state[action.payload.code].relevance;
    },
    setDefaultValue: (state, action) => {
      const { code, selectedValue } = action.payload;
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
    },
    cloneQuestion: (state, action) => {
      const code = action.payload;
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
      designState.caseReducers.setup(state, {
        payload: { code: newQuestionId, rules: setupOptions(newQuestion.type) },
      });
      cleanupRandomRules(group);
      state.index = buildCodeIndex(state);
      state.focus = newQuestionId;
    },
    removeAnswer: (state, action) => {
      const answerQualifiedCode = action.payload;
      const codes = splitQuestionCodes(answerQualifiedCode);
      let question = state[codes[0]];
      question.children = question.children.filter(
        (el) => el.code !== codes[1],
      );
      delete state[answerQualifiedCode];
      // could be otherText
      if (state.setup?.code?.includes(answerQualifiedCode)) {
        designState.caseReducers.resetSetup(state);
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
    },
    addNewAnswers: (state, action) => {
      const questionCode = action.payload.questionCode;
      const data = action.payload.data;
      const type = action.payload.type;
      let index = action.payload.index;
      const question = state[questionCode];
      const children =
        question.children?.filter(
          (it) => state[it.qualifiedCode].type == type,
        ) || [];
      data.forEach((item, itemIndex) => {
        if (item) {
          const nextAnswer = children[index + 1];
          if (
            nextAnswer &&
            nextAnswer.qualifiedCode &&
            state[nextAnswer.qualifiedCode]
          ) {
            designState.caseReducers.changeContent(state, {
              payload: {
                code: nextAnswer.qualifiedCode,
                key: "label",
                value: item,
                lang: state.langInfo.lang,
              },
            });
          } else if (state.designMode === DESIGN_SURVEY_MODE.DESIGN) {
            designState.caseReducers.addNewAnswer(state, {
              payload: {
                questionCode,
                label: item,
                type,
                index,
                focus: itemIndex == data.length - 1,
              },
            });
          }

          index++;
        }
      });
    },
    onNewLine: (state, action) => {
      const questionCode = action.payload.questionCode;
      const index = action.payload.index;
      const type = action.payload.type;
      const answers = state[questionCode].children || [];
      const nextAnswerOfSameType = answers.filter(
        (answer) => answer.type == type,
      )[index + 1];
      if (nextAnswerOfSameType && nextAnswerOfSameType.qualifiedCode) {
        state.focus = nextAnswerOfSameType.qualifiedCode;
      } else if (state.designMode === DESIGN_SURVEY_MODE.DESIGN) {
        designState.caseReducers.addNewAnswer(state, {
          payload: {
            questionCode,
            type,
            index,
          },
        });
      }
    },
    addNewAnswer: (state, action) => {
      const questionCode = action.payload.questionCode;
      const type = action.payload.type;
      const index = action.payload.index;
      const focus = action.payload.focus || true;
      let label = action.payload.label;
      const answers = state[questionCode].children || [];
      let nextAnswerIndex = 1;
      let code = "";
      let qualifiedCode = "";
      switch (type) {
        case "column":
          nextAnswerIndex = nextId(
            answers.filter((el) => el.type === "column"),
          );

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
    },

    deleteGroup: (state, action) => {
      const groupCode = action.payload;
      if (state.setup?.code == groupCode) {
        designState.caseReducers.resetSetup(state);
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
    },
    deleteQuestion: (state, action) => {
      const questionCode = action.payload;
      if (state.setup?.code == questionCode) {
        designState.caseReducers.resetSetup(state);
      }
      const survey = state.Survey;
      const group = survey.children
        ?.map((group) => state[group.code])
        ?.filter(
          (group) =>
            group.children &&
            group.children.findIndex((child) => child.code == questionCode) !==
              -1,
        )?.[0];
      if (!group) {
        return;
      }
      const questionIndex = group.children.findIndex(
        (x) => x.code === questionCode,
      );
      let children = [...group.children];
      if (children.length === 1) {
        group.children = [];
      } else {
        group.children.splice(questionIndex, 1);
      }
      delete state[questionCode];
      cleanupRandomRules(group);
      cleanupSkipDestinations(state, questionCode);
    },
    convertQuestion: (state, action) => {
      const { questionCode, newType } = action.payload;

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
      designState.caseReducers.setup(state, {
        payload: { code: questionCode, rules: setupOptions(newType) },
      });
    },
    changeContent: (state, action) => {
      let payload = action.payload;
      if (!state[payload.code].content) {
        state[payload.code].content = {};
        state[payload.code].content[payload.lang] = {};
      } else if (!state[payload.code].content[payload.lang]) {
        state[payload.code].content[payload.lang] = {};
      }
      const prefixToRemove = `format_${payload.key}_${payload.lang}`;
      const toRemove = state[payload.code].instructionList?.filter(
        (instruction) => instruction.code.startsWith(prefixToRemove),
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
    },
    changeCustomCss: (state, action) => {
      let payload = action.payload;
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
    },
    changeResources: (state, action) => {
      let payload = action.payload;
      if (!state[payload.code].resources) {
        state[payload.code].resources = {};
      }
      state[payload.code].resources[payload.key] = payload.value;
    },
    updateRandom: (state, action) => {
      const payload = action.payload;
      const componentState = state[payload.code];
      if (payload.groups) {
        const instruction = { code: "random_group", groups: payload.groups };
        changeInstruction(componentState, instruction);
      } else {
        removeInstruction(componentState, "random_group");
      }
    },
    updateRandomByType: (state, action) => {
      const payload = action.payload;
      const componentState = state[payload.code];
      const otherChildrenCodes = state[payload.code]?.children
        ?.filter((el) => el.type !== payload.type)
        ?.map((el) => el.code);
      const randomInstruction = instructionByCode(
        componentState,
        "random_group",
      );
      const otherRandomOrders =
        randomInstruction?.groups?.filter(
          (x) =>
            x.length && x.some((elem) => otherChildrenCodes.includes(elem)),
        ) || [];
      const groups = payload.groups.concat(otherRandomOrders);
      if (groups) {
        const instruction = { code: "random_group", groups };
        changeInstruction(componentState, instruction);
      } else {
        removeInstruction(componentState, "random_group");
      }
    },
    updatePriority: (state, action) => {
      const payload = action.payload;
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
    },

    // === SKIP LOGIC REDUCERS ===
    addSkipRule: (state, action) => {
      const { code } = action.payload;
      if (!state[code].skip_logic) {
        state[code].skip_logic = [];
      }
      state[code].skip_logic.push({ condition: [], skipTo: null });
    },
    updateSkipRule: (state, action) => {
      const { code, ruleIndex, updates } = action.payload;
      const rule = state[code].skip_logic[ruleIndex];
      Object.assign(rule, updates);
      // Reset toEnd/disqualify if destination is not a group
      if (updates.skipTo && !updates.skipTo.startsWith("G")) {
        rule.toEnd = false;
        rule.disqualify = false;
      }
      addSkipInstructions(state, code);
    },
    removeSkipRule: (state, action) => {
      const { code, ruleIndex } = action.payload;
      state[code].skip_logic.splice(ruleIndex, 1);
      addSkipInstructions(state, code);
    },

    addCustomValidationRule: (state, action) => {
      const { code } = action.payload;

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
    },

    updateCustomValidationRuleText: (state, action) => {
      const { code, ruleCode, text } = action.payload;
      state[code].instructionList.find((i) => i.code === ruleCode).text = text;
    },

    renameCustomValidationRule: (state, action) => {
      const { code, ruleCode, newCode } = action.payload;
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
    },

    updateCustomValidationRuleError: (state, action) => {
      const { code, ruleCode, lang, value } = action.payload;
      console.log(code, ruleCode, lang, value);
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
    },

    removeCustomValidationRule: (state, action) => {
      const { code, ruleCode } = action.payload;

      changeInstruction(state[code], { code: ruleCode, remove: true });

      const content = state[code].content || {};
      Object.keys(content).forEach((lang) => {
        delete content[lang][ruleCode];
      });
    },

    updateInstruction: (state, action) => {
      const { code, instruction } = action.payload;

      if (!state[code]) {
        return;
      }

      changeInstruction(state[code], instruction);
    },

    onBaseLangChanged: (state, action) => {
      state.langInfo.mainLang = action.payload.code;
      state.Survey.defaultLang = action.payload;
      state.Survey.additionalLang = state.Survey.additionalLang?.filter(
        (language) => language.code !== action.payload.code,
      );
      state.langInfo.lang = action.payload.code;
      state.langInfo.onMainLang = true;
      state.langInfo.languagesList = [action.payload].concat(
        state.Survey.additionalLang || [],
      );
    },
    onAdditionalLangAdded: (state, action) => {
      state.Survey.additionalLang = (state.Survey.additionalLang || []).concat(
        action.payload,
      );
      state.langInfo.languagesList = [state.Survey.defaultLang].concat(
        state.Survey.additionalLang || [],
      );
    },
    onAdditionalLangRemoved: (state, action) => {
      state.Survey.additionalLang = state.Survey.additionalLang.filter(
        (language) => language.code !== action.payload.code,
      );
      state.langInfo.languagesList = [state.Survey.defaultLang].concat(
        state.Survey.additionalLang || [],
      );
    },
    changeLang: (state, action) => {
      state.langInfo.lang = action.payload;
      state.langInfo.onMainLang =
        state.langInfo.lang == state.langInfo.mainLang;
    },
    resetFocus: (state, action) => {
      state.focus = null;
    },
    setSaving: (state, action) => {
      state.isSaving = action.payload;
    },
    refreshDsl: (state, action) => {
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
    },
    setUpdating: (state, action) => {
      state.isUpdating = action.payload;
    },
    onDrag: (state, action) => {
      state.skipScroll = true;

      const payload = action.payload;
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
          break;
        case "reorder_answers_by_type":
          reorderAnswersByType(state, payload);
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
          // do nothing
          deafult: break;
      }
    },
    addComponent: (state, action) => {
      const { type, questionType } = action.payload;
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
    },
  },
});

export const {
  newVersionReceived,
  designStateReceived,
  onBaseLangChanged,
  onAdditionalLangAdded,
  onAdditionalLangRemoved,
  changeLang,
  changeCustomCss,
  changeAttribute,
  changeTimeFormats,
  changeContent,
  changeResources,
  deleteQuestion,
  cloneQuestion,
  convertQuestion,
  deleteGroup,
  onNewLine,
  resetFocus,
  addNewAnswer,
  addNewAnswers,
  setDesignModeToDesign,
  setDesignModeToLang,
  setDesignModeToTheme,
  removeAnswer,
  setup,
  clearHighlighted,
  setShowAdvanced,
  resetSetup,
  changeValidationValue,
  updateRandom,
  updateRandomByType,
  updatePriority,
  addSkipRule,
  updateSkipRule,
  removeSkipRule,
  addCustomValidationRule,
  updateCustomValidationRuleText,
  renameCustomValidationRule,
  updateCustomValidationRuleError,
  removeCustomValidationRule,
  updateInstruction,
  changeRelevance,
  clearRelevanceConfig,
  setDefaultValue,
  onDrag,
  addComponent,
  setSaving,
  refreshDsl,
  setUpdating,
} = designState.actions;

export default designState.reducer;

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
  const questionObject = createQuestion(
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
    addAnswerInstructions(
      state,
      state[element.qualifiedCode],
      newCode,
      newCode,
    );
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
  designState.caseReducers.setup(state, {
    payload: {
      code: newCode,
      rules: setupOptions(payload.questionType),
    },
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
  designState.caseReducers.setup(state, {
    payload: {
      code: group.newGroup.code,
      rules: setupOptions(group.newGroup.type),
    },
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
    designState.caseReducers.setup(state, {
      payload: {
        code: group.newGroup.code,
        rules: setupOptions(group.newGroup.type),
      },
    });
  } else if (payload.groupType == "end") {
    const group = createGroup("END", nextGroupId(survey.children));
    survey.children.push(group.newGroup);
    state[group.newGroup.code] = group.state;
    designState.caseReducers.setup(state, {
      payload: {
        code: group.newGroup.code,
        rules: setupOptions(group.newGroup.type),
      },
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
  survey.children = reorder(
    survey.children,
    payload.fromIndex,
    payload.toIndex,
  );
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

const buildCodeIndex = (state) => {
  let retrunRestult = {};
  let groupCount = 0;
  let questionCount = 0;
  state.Survey.children?.forEach((group) => {
    groupCount++;
    retrunRestult[group.code] = "P" + groupCount;
    let groupObj = state[group.code];
    if (groupObj.children) {
      groupObj.children.forEach((question) => {
        questionCount++;
        retrunRestult[question.code] = "Q" + questionCount;
        let questionObj = state[question.code];
        if (questionObj.children) {
          questionObj.children.forEach((answer) => {
            retrunRestult[answer.qualifiedCode] =
              "Q" + questionCount + answer.code;
          });
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
  let newCode = cloneDeep(code);
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
  const newState = cloneDeep(toBeCopied);
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
