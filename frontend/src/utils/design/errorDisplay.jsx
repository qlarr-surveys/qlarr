import { Trans } from "react-i18next";
import { isGroup, isQuestion } from "~/utils/design/utils";

export const isLabelInstruction = (code) =>
  code.startsWith("format_") &&
  !code.startsWith("format_custom_css_") &&
  !/^format_validation_/.test(code);

export const getHighlighted = (code) => {
  if (code === "conditional_relevance") return "relevance";
  if (code === "random_group" || code === "priority_groups") return "random";
  if (code.startsWith("skip_to")) return "skip_logic";
  if (code === "order") return "order_instructions";
  if (code.startsWith("validation_custom_")) return "custom_validation_rules";
  if (code.startsWith("format_custom_css_")) return "customCss";
  if (/^format_validation_custom_/.test(code)) return "custom_validation_rules";
  if (/^format_validation_/.test(code)) return "validation";
  return null;
};

export const mapComponentError = (code, error, t) => {
  if (error === "EMPTY_PARENT") {
    return {
      label: error,
      message: t("err_empty_parent", {
        component_name: componentName(code, t),
        child_name: componentChildName(code, t),
      }),
    };
  } else if (error === "DUPLICATE_CODE") {
    return {
      label: error,
      message: t("err_duplicate_code", {
        component_name: componentName(code, t),
      }),
    };
  } else if (error === "NO_END_GROUP") {
    return { label: error, message: t("err_no_end_group") };
  } else if (error === "MISPLACED_END_GROUP") {
    return { label: error, message: t("err_misplaced_end_group") };
  } else if (error === "MISPLACED_WELCOME_GROUP") {
    return { label: error, message: t("err_misplaced_welcome_group") };
  }
  return { label: error, message: null };
};

export const mapInstructionError = (instruction, t, currentLang) => {
  const rawMessage = instruction.errors[0]?.message;
  if (
    instruction.code === "value" &&
    instruction.errors[0].name === "InvalidInstructionInEndGroup"
  ) {
    return { label: t("err_value_in_end_group"), message: rawMessage };
  } else if (instruction.code === "conditional_relevance") {
    return { label: t("err_relevance"), message: rawMessage };
  } else if (instruction.code === "random_group") {
    return { label: t("err_random"), message: rawMessage };
  } else if (instruction.code === "priority_groups") {
    return { label: t("err_priority"), message: rawMessage };
  } else if (instruction.code.startsWith("reference")) {
    return {
      label: (
        <Trans
          t={t}
          values={{
            codes: instruction.errors
              .map((error) => error.dependency?.componentCode)
              .join(", "),
            lang: instruction.lang,
          }}
          i18nKey="err_reference"
        />
      ),
      message: rawMessage,
    };
  } else if (instruction.code.startsWith("skip_to")) {
    return { label: t("err_skip"), message: rawMessage };
  } else if (instruction.code === "order") {
    return { label: t("order_priority"), message: rawMessage };
  } else if (instruction.code.startsWith("format_custom_css_")) {
    return { label: t("custom_css"), message: rawMessage };
  } else if (/^format_validation_custom_/.test(instruction.code)) {
    return { label: t("custom_validation_rules"), message: rawMessage };
  } else if (/^format_validation_/.test(instruction.code)) {
    return { label: t("validation"), message: rawMessage };
  } else if (instruction.code.startsWith("validation_custom_")) {
    return { label: t("custom_validation_rules"), message: rawMessage };
  } else if (instruction.code.startsWith("format_")) {
    const field = instruction.code
      .replace(/^format_/, "")
      .replace(/_[a-z]{2,3}_\d+$/, "")
      .replace(/_/g, " ");
    const lang = instruction.lang;
    const showLang = lang && lang !== currentLang;
    return {
      label: showLang ? `${field} (${lang})` : field,
      message: rawMessage,
    };
  }
  return { label: instruction.code, message: rawMessage };
};

const componentName = (code, t) => {
  if (code === "Survey") return t("survey");
  if (isQuestion(code)) return t("question");
  if (isGroup(code)) return t("group");
  return t("option");
};

const componentChildName = (code, t) => {
  if (isGroup(code)) return t("question");
  if (code === "Survey") return t("group");
  return t("option");
};
