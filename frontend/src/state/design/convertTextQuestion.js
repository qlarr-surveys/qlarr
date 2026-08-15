import { setupOptions } from "~/constants/design";
import { removeInstruction } from "./addInstructions";

export function convertTextQuestion(currentQuestion, newType) {
  if (!currentQuestion.validation) {
    currentQuestion.validation = {};
  }

  const validRules =
    setupOptions(newType)?.find((s) => s.key === "validation")?.rules || [];

  Object.keys(currentQuestion.validation).forEach((rule) => {
    if (!validRules.includes(rule)) {
      delete currentQuestion.validation[rule];
      removeInstruction(currentQuestion, rule);
    }
  });

  if (newType === "email" && !currentQuestion.validation.validation_pattern_email) {
    currentQuestion.validation.validation_pattern_email = { isActive: true };
  }
}
