import { isSingleSelect, mediaGroup, ARRAY_MIN_WIDTH_KEYS, setupOptions } from "~/constants/design";

const getValidationRules = (type) => {
  const sections = setupOptions(type);
  return sections?.find((s) => s.key === "validation")?.rules || [];
};

export function computeTextLostAttributes(question, newType) {
  const srcRules = getValidationRules(question.type);
  const dstRules = getValidationRules(newType);
  const willBeLost = srcRules.filter((r) => !dstRules.includes(r));
  const hasActiveLost = willBeLost.some((r) => question?.validation?.[r]?.isActive);
  return hasActiveLost ? ["lost_text_validations"] : [];
}

export function computeChoiceLostAttributes(question, answers, newType) {
  const lost = [];
  const srcSingle = isSingleSelect(question.type);
  const dstSingle = isSingleSelect(newType);
  const srcGroup = mediaGroup(question.type);
  const dstGroup = mediaGroup(newType);

  if (srcSingle && !dstSingle) {
    if (question?.skip_logic?.length > 0) {
      lost.push("lost_skip_logic");
    }
    if (question?.validation?.validation_required?.isActive) {
      lost.push("lost_validation_required");
    }
    const defaultValueInstruction = question?.instructionList?.find(
      (i) => i.code === "value" && i.text
    );
    if (defaultValueInstruction) {
      lost.push("lost_default_value");
    }
  }

  if (!srcSingle && dstSingle) {
    const hasActiveCountValidation = [
      "validation_min_option_count",
      "validation_max_option_count",
      "validation_option_count",
    ].some((r) => question?.validation?.[r]?.isActive);
    if (hasActiveCountValidation) {
      lost.push("lost_validation_option_count");
    }
  }

  if (srcGroup === "icon" && dstGroup !== "icon") {
    if (answers.some((a) => a?.resources?.icon)) {
      lost.push("lost_answer_icons");
    }
  }

  if (srcGroup === "image" && dstGroup !== "image") {
    if (answers.some((a) => a?.resources?.image)) {
      lost.push("lost_answer_images");
    }
  }

  return lost;
}

export function computeArrayLostAttributes(question, columns, newType) {
  const lost = [];
  const srcIsIcon = question.type === "scq_icon_array";
  const dstIsIcon = newType === "scq_icon_array";

  if (srcIsIcon && !dstIsIcon) {
    if (columns.some((c) => c?.resources?.icon)) {
      lost.push("lost_column_icons");
    }
  }

  if (!srcIsIcon && dstIsIcon) {
    if (ARRAY_MIN_WIDTH_KEYS.some((k) => question[k] != null)) {
      lost.push("lost_min_width_settings");
    }
  }

  return lost;
}

export function computeDateTimeLostAttributes(question, newType) {
  const lost = [];

  if (newType === "time") {
    if (question?.minDate || question?.maxDate) {
      lost.push("lost_date_bounds");
    }
  }

  if (newType === "date") {
    if (question?.fullDayFormat === true) {
      lost.push("lost_fullday_format");
    }
  }

  return lost;
}
