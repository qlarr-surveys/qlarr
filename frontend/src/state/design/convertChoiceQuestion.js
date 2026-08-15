import {
  CONVERTIBLE_CHOICE_TYPES,
  isSingleSelect,
  mediaGroup,
} from "~/constants/design";
import {
  addAnswerInstructions,
  addMaskedValuesInstructions,
  addQuestionValueInstruction,
  addSkipInstructions,
  changeInstruction,
  refreshEnumForSingleChoice,
  refreshListForMultipleChoice,
  removeInstruction,
} from "./addInstructions";

// Validations that only make sense for one selection model: multi-select uses
// option-count rules, single-select uses validation_required.
const MULTI_ONLY_VALIDATIONS = [
  "validation_min_option_count",
  "validation_max_option_count",
  "validation_option_count",
];
const SINGLE_ONLY_VALIDATIONS = ["validation_required"];

// Engine-generated value validations that get persisted into the DSL: a list
// value carries `validation_list` (membership check via .every()), a single
// value carries `validation_enum`. After a question is narrowed multi→single, a
// stale `validation_list` calls .every() on the now-string value and throws,
// crashing the run/preview — so the one for the wrong model must be dropped too.
const MULTI_ONLY_VALUE_VALIDATIONS = ["validation_list"];
const SINGLE_ONLY_VALUE_VALIDATIONS = ["validation_enum"];

/**
 * Remove validation rules and instructions that don't apply to a choice
 * question's current selection model. Idempotent and safe to call on any node —
 * it no-ops for non-choice types. Used both when converting a question's type
 * and when healing a survey on load.
 */
export function normalizeChoiceValidations(question) {
  if (!question || !CONVERTIBLE_CHOICE_TYPES.includes(question.type)) {
    return;
  }
  const single = isSingleSelect(question.type);
  const codesToRemove = single
    ? [...MULTI_ONLY_VALIDATIONS, ...MULTI_ONLY_VALUE_VALIDATIONS]
    : [...SINGLE_ONLY_VALIDATIONS, ...SINGLE_ONLY_VALUE_VALIDATIONS];
  codesToRemove.forEach((code) => {
    if (question.validation && code in question.validation) {
      delete question.validation[code];
    }
    if (question.instructionList) {
      removeInstruction(question, code);
    }
  });
}

export function convertChoiceQuestion(
  state,
  questionCode,
  currentQuestion,
  currentType,
  newType
) {
  const srcGroup = mediaGroup(currentType);
  const dstGroup = mediaGroup(newType);
  const srcSingle = isSingleSelect(currentType);
  const dstSingle = isSingleSelect(newType);

  // Remove skip_logic when converting from single-select to multi-select
  if (srcSingle && !dstSingle) {
    delete currentQuestion.skip_logic;
  }

  // Remove validations incompatible with the new selection model (and any stale
  // engine value-validation for the old one). currentQuestion.type is already
  // newType here, so this keys off the destination model.
  normalizeChoiceValidations(currentQuestion);

  // Answer-level resource cleanup — remove resources irrelevant to target type
  if (srcGroup === "icon" && dstGroup !== "icon") {
    (currentQuestion.children || []).forEach((child) => {
      const answer = state[child.qualifiedCode];
      if (answer?.resources) delete answer.resources.icon;
    });
  }
  if (srcGroup === "image" && dstGroup !== "image") {
    (currentQuestion.children || []).forEach((child) => {
      const answer = state[child.qualifiedCode];
      if (answer?.resources) delete answer.resources.image;
    });
  }

  // Visual property transitions
  if (dstGroup === "plain") {
    delete currentQuestion.columns;
    delete currentQuestion.iconSize;
    delete currentQuestion.imageAspectRatio;
    delete currentQuestion.spacing;
    delete currentQuestion.hideText;
  } else if (dstGroup === "icon") {
    if (srcGroup === "image") {
      delete currentQuestion.imageAspectRatio;
      if (!currentQuestion.iconSize) currentQuestion.iconSize = "150";
    } else if (srcGroup === "plain") {
      if (currentQuestion.columns == null) currentQuestion.columns = 3;
      if (currentQuestion.iconSize == null) currentQuestion.iconSize = "150";
      if (currentQuestion.spacing == null) currentQuestion.spacing = 8;
    }
  } else if (dstGroup === "image") {
    if (srcGroup === "icon") {
      delete currentQuestion.iconSize;
      if (currentQuestion.imageAspectRatio == null)
        currentQuestion.imageAspectRatio = 1;
    } else if (srcGroup === "plain") {
      if (currentQuestion.columns == null) currentQuestion.columns = 3;
      if (currentQuestion.imageAspectRatio == null)
        currentQuestion.imageAspectRatio = 1;
      if (currentQuestion.spacing == null) currentQuestion.spacing = 8;
    }
  }

  // Preserve conditional_relevance — it lives only in instructionList with no
  // backing data property, so it must be saved before the list is wiped
  const conditionalRelevanceInstruction = currentQuestion.instructionList?.find(
    (i) => i.code === "conditional_relevance"
  );

  // Re-initialize question instructions for the new type
  addQuestionValueInstruction(currentQuestion);
  addSkipInstructions(state, questionCode);

  // Restore conditional_relevance if it was set before conversion
  if (conditionalRelevanceInstruction) {
    changeInstruction(currentQuestion, conditionalRelevanceInstruction);
  }

  // Re-initialize answer instructions for each child and grandchild
  // (grandchildren cover other_text, which is nested inside Aother)
  (currentQuestion.children || []).forEach((child) => {
    addAnswerInstructions(
      state,
      state[child.qualifiedCode],
      questionCode,
      questionCode
    );
    (state[child.qualifiedCode]?.children || []).forEach((grandchild) => {
      addAnswerInstructions(
        state,
        state[grandchild.qualifiedCode],
        child.qualifiedCode,
        questionCode
      );
    });
  });

  // Refresh return type (enum for single-select, list for multi-select)
  refreshEnumForSingleChoice(currentQuestion, state);
  refreshListForMultipleChoice(currentQuestion, state);

  // Re-apply masked value instructions
  addMaskedValuesInstructions(questionCode, currentQuestion, state);
}
