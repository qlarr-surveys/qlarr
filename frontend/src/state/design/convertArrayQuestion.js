import { ARRAY_MIN_WIDTH_KEYS } from "~/constants/design";
import {
  addAnswerInstructions,
  changeInstruction,
  refreshEnumForSingleChoice,
  refreshListForMultipleChoice,
} from "./addInstructions";

export function convertArrayQuestion(
  state,
  questionCode,
  currentQuestion,
  currentType,
  newType
) {
  // Column-level icon resource cleanup when leaving scq_icon_array
  if (currentType === "scq_icon_array" && newType !== "scq_icon_array") {
    (currentQuestion.children || [])
      .filter((c) => c.type === "column")
      .forEach((c) => {
        const col = state[c.qualifiedCode];
        if (col?.resources) delete col.resources.icon;
      });
  }

  // Remove min-width properties not supported by scq_icon_array
  if (newType === "scq_icon_array") {
    ARRAY_MIN_WIDTH_KEYS.forEach((k) => delete currentQuestion[k]);
  }

  // Preserve conditional_relevance across instruction re-init
  const conditionalRelevanceInstruction =
    currentQuestion.instructionList?.find(
      (i) => i.code === "conditional_relevance"
    );

  if (conditionalRelevanceInstruction) {
    changeInstruction(currentQuestion, conditionalRelevanceInstruction);
  }

  // Re-init per-child instructions (rows get a value instruction; columns get none)
  (currentQuestion.children || []).forEach((child) => {
    addAnswerInstructions(
      state,
      state[child.qualifiedCode],
      questionCode,
      questionCode
    );
  });

  // Refresh per-row return types using shared helpers
  refreshEnumForSingleChoice(currentQuestion, state);
  refreshListForMultipleChoice(currentQuestion, state);
}
