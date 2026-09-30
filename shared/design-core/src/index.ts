// @qlarr/design-core — Redux-agnostic survey design/mutation logic.
//
// Consumed by the frontend (as a createSlice delegate), the NestJS backend, and
// the cloud AI module. Everything here is pure: no React/MUI/DOM, no Redux/immer.

// All mutation functions + buildDesignState + mapCodeToUserFriendlyOrder.
export * from "./state/mutations";

// Repetition authoring: enable/disable/updateRepetitionSource + pure derivation.
export * from "./state/repetition";

// Pure helpers consumed by the frontend and AI directly.
export { instructionByCode } from "./state/addInstructions";
export { isQuestion, isGroup, buildCodeIndex } from "./utils/pureUtils";
export { accessibleDependencies } from "./utils/dependencies";
export { getFieldType, hasOtherOption, isRankingType } from "./factory/fieldTypes";
export {
  isArrayType,
  setupOptions,
  CARRY_FORWARD_SOURCE_TYPES,
} from "./constants/design";
export { STRIP_TAGS_PATTERN } from "./constants/instruction";
export { DESIGN_SURVEY_MODE } from "./constants/designMode";
