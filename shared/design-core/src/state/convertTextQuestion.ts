// @ts-nocheck — loose JS-origin logic; internals stay untyped, public API typed at index.ts
import { setupOptions } from "../constants/design";
import { changeInstruction, removeInstruction } from "./addInstructions";

const valueReturnType = (type) => (type === "number" ? "double" : "string");

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

  // decimal_separator and the masked_value it drives are number-only.
  if (newType !== "number") {
    delete currentQuestion.decimal_separator;
    removeInstruction(currentQuestion, "masked_value");
  }

  if (newType === "email" && !currentQuestion.validation.validation_pattern_email) {
    currentQuestion.validation.validation_pattern_email = { isActive: true };
  }

  // The value's type follows the question type (number → double, others →
  // string). A value of the old type is meaningless under the new one, so drop it.
  const valueInstruction = currentQuestion.instructionList?.find(
    (instruction) => instruction.code === "value",
  );
  const returnType = valueReturnType(newType);
  if (valueInstruction && valueInstruction.returnType !== returnType) {
    changeInstruction(currentQuestion, {
      ...valueInstruction,
      returnType,
      text: "",
    });
  }
}
