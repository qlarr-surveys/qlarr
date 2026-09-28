import { createSlice } from "@reduxjs/toolkit";
import * as core from "@qlarr/design-core";

// The survey-mutation logic now lives in @qlarr/design-core as Redux-agnostic
// pure functions shared with the backend and AI module. This slice is a thin
// shell: every reducer is a one-line delegator that hands immer's draft to the
// matching core function. Signatures, action creators and the store contract
// are unchanged — behaviour is identical to the former in-slice implementation.
//
// UI-only reducers delegate too (their bodies were pure state mutations); the
// core owns them so a mutation like `cloneQuestion` can call `setup`/`resetSetup`
// without reaching back into Redux.

export const designState = createSlice({
  name: "designState",
  initialState: { state: {} },
  reducers: {
    designStateReceived: (state, action) =>
      core.buildDesignState(state, action.payload),
    setup: (state, action) => core.setup(state, action.payload),
    clearHighlighted: (state) => core.clearHighlighted(state),
    setShowAdvanced: (state, action) =>
      core.setShowAdvanced(state, action.payload),
    newVersionReceived: (state, action) =>
      core.newVersionReceived(state, action.payload),
    changeValidationValue: (state, action) =>
      core.changeValidationValue(state, action.payload),
    resetSetup: (state) => core.resetSetup(state),
    setDesignModeToDesign: (state) => core.setDesignModeToDesign(state),
    setDesignModeToLang: (state) => core.setDesignModeToLang(state),
    setDesignModeToTheme: (state) => core.setDesignModeToTheme(state),
    changeAttribute: (state, action) =>
      core.changeAttribute(state, action.payload),
    changeRelevance: (state, action) =>
      core.changeRelevance(state, action.payload),
    clearRelevanceConfig: (state, action) =>
      core.clearRelevanceConfig(state, action.payload),
    setDefaultValue: (state, action) =>
      core.setDefaultValue(state, action.payload),
    cloneQuestion: (state, action) =>
      core.cloneQuestion(state, action.payload),
    removeAnswer: (state, action) => core.removeAnswer(state, action.payload),
    addNewAnswers: (state, action) =>
      core.addNewAnswers(state, action.payload),
    onNewLine: (state, action) => core.onNewLine(state, action.payload),
    addNewAnswer: (state, action) => core.addNewAnswer(state, action.payload),
    deleteGroup: (state, action) => core.deleteGroup(state, action.payload),
    deleteQuestion: (state, action) =>
      core.deleteQuestion(state, action.payload),
    convertQuestion: (state, action) =>
      core.convertQuestion(state, action.payload),
    changeContent: (state, action) =>
      core.changeContent(state, action.payload),
    changeCustomCss: (state, action) =>
      core.changeCustomCss(state, action.payload),
    changeResources: (state, action) =>
      core.changeResources(state, action.payload),
    updateRandom: (state, action) => core.updateRandom(state, action.payload),
    updateRandomByType: (state, action) =>
      core.updateRandomByType(state, action.payload),
    updatePriority: (state, action) =>
      core.updatePriority(state, action.payload),
    addSkipRule: (state, action) => core.addSkipRule(state, action.payload),
    updateSkipRule: (state, action) =>
      core.updateSkipRule(state, action.payload),
    removeSkipRule: (state, action) =>
      core.removeSkipRule(state, action.payload),
    addCustomValidationRule: (state, action) =>
      core.addCustomValidationRule(state, action.payload),
    updateCustomValidationRuleText: (state, action) =>
      core.updateCustomValidationRuleText(state, action.payload),
    renameCustomValidationRule: (state, action) =>
      core.renameCustomValidationRule(state, action.payload),
    updateCustomValidationRuleError: (state, action) =>
      core.updateCustomValidationRuleError(state, action.payload),
    removeCustomValidationRule: (state, action) =>
      core.removeCustomValidationRule(state, action.payload),
    updateInstruction: (state, action) =>
      core.updateInstruction(state, action.payload),
    onBaseLangChanged: (state, action) =>
      core.onBaseLangChanged(state, action.payload),
    onAdditionalLangAdded: (state, action) =>
      core.onAdditionalLangAdded(state, action.payload),
    onAdditionalLangRemoved: (state, action) =>
      core.onAdditionalLangRemoved(state, action.payload),
    changeLang: (state, action) => core.changeLang(state, action.payload),
    resetFocus: (state) => core.resetFocus(state),
    setSaving: (state, action) => core.setSaving(state, action.payload),
    refreshDsl: (state) => core.refreshDsl(state),
    setUpdating: (state, action) => core.setUpdating(state, action.payload),
    onDrag: (state, action) => core.onDrag(state, action.payload),
    addComponent: (state, action) => core.addComponent(state, action.payload),
    enableCarryForward: (state, action) =>
      core.enableCarryForward(state, action.payload),
    updateCarryForward: (state, action) =>
      core.updateCarryForward(state, action.payload),
    disableCarryForward: (state, action) =>
      core.disableCarryForward(state, action.payload),
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
  enableCarryForward,
  updateCarryForward,
  disableCarryForward,
} = designState.actions;

// Re-exported from @qlarr/design-core to preserve the former public export.
export const mapCodeToUserFriendlyOrder = core.mapCodeToUserFriendlyOrder;

export default designState.reducer;
