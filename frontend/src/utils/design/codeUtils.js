export const ALLOWED_CODE_CHARS_REGEX = /[^a-z0-9_]/g;

export const computePrefixAndSuffix = (fullCode) => {
  if (fullCode.startsWith("Q") && fullCode.includes("A")) {
    const lastAIndex = fullCode.lastIndexOf("A");
    if (lastAIndex > 0 && lastAIndex < fullCode.length) {
      return {
        prefix: fullCode.slice(0, lastAIndex + 1),
        suffix: fullCode.slice(lastAIndex + 1),
      };
    }
  }

  if (fullCode.startsWith("G")) {
    return {
      prefix: "G",
      suffix: fullCode.slice(1),
    };
  }

  if (fullCode.startsWith("Q")) {
    return {
      prefix: "Q",
      suffix: fullCode.slice(1),
    };
  }

  return {
    prefix: "",
    suffix: fullCode,
  };
};

export const selectMaxSuffixLength = (state, prefix, suffix) => {
  if (!prefix.endsWith("A") || prefix.length < 2) return suffix.length;
  const questionCode = prefix.slice(0, -1);
  const question = state.designState[questionCode];
  if (!question?.children) return suffix.length;
  let max = suffix.length;
  for (const child of question.children) {
    if (!child.qualifiedCode) continue;
    const { suffix: s } = computePrefixAndSuffix(child.qualifiedCode);
    if (s.length > max) max = s.length;
  }
  return max;
};

export const getErrorMessage = (error, t) => {
  if (!error) {
    return "";
  }
  const translationKey = `processed_errors.${error.name}`;
  const message = t(translationKey);

  if (message === translationKey) {
    return t("processed_errors.unidentified_error");
  }

  return message;
};
