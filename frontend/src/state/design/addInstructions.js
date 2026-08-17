export const cleanupDefaultValue = (component) => {
  // Check if this is a single choice question type that supports default values
  if (
    !component.type ||
    !["scq", "icon_scq", "image_scq"].includes(component.type)
  ) {
    return;
  }

  // Find the value instruction that contains the default value
  const valueInstruction = component.instructionList?.find(
    (instruction) => instruction.code === "value",
  );

  if (!valueInstruction || !valueInstruction.text) {
    return; // No default value set
  }

  // Get current answer codes
  const currentAnswerCodes =
    component.children?.map((child) => child.code) || [];

  // Check if the current default value still exists in the answers
  if (!currentAnswerCodes.includes(valueInstruction.text)) {
    // Default value refers to a deleted answer - clear the text value
    changeInstruction(component, {
      ...valueInstruction,
      text: "",
      isActive: false,
    });
  }
};

export const addSkipInstructions = (state, code) => {
  const component = state[code];
  if (
    component.type != "scq" &&
    component.type != "image_scq" &&
    component.type != "icon_scq"
  ) {
    return;
  }

  // Clean up skip_logic conditions to remove invalid answer codes
  if (component.skip_logic && Array.isArray(component.skip_logic)) {
    const validAnswerCodes =
      component.children?.map((child) => child.code) || [];

    component.skip_logic = component.skip_logic
      .map((rule) => ({
        ...rule,
        condition:
          rule.condition?.filter((answerCode) =>
            validAnswerCodes.includes(answerCode),
          ) || [],
      }))
      .filter((rule) => rule.condition.length > 0);
  }

  const instructions = scqSkipEquations(code, component);
  instructions.forEach((instruction) => {
    changeInstruction(state[code], instruction);
  });
};

export const refreshEnumForSingleChoice = (component, state) => {
  if (
    !component.type ||
    !["scq", "icon_scq", "image_scq", "scq_icon_array", "scq_array"].includes(
      component.type,
    )
  ) {
    return;
  }
  switch (component.type) {
    case "image_scq":
    case "icon_scq":
    case "scq":
      let valueInstruction = component.instructionList?.find(
        (it) => it.code == "value",
      );
      if (!valueInstruction) break;
      if (component.children && component.children.length) {
        valueInstruction.returnType = {
          type: "enum",
          values: component.children.map((it) => it.code),
        };
        changeInstruction(component, valueInstruction);
      } else {
        valueInstruction.returnType = "string";
        changeInstruction(component, valueInstruction);
      }
      break;
    case "scq_icon_array":
    case "scq_array":
      if (
        component.children &&
        component.children.length &&
        component.children.filter((el) => el.type == "column").length &&
        component.children.filter((el) => el.type === "row").length
      ) {
        component.children
          .filter((el) => el.type === "row")
          .forEach((el) => {
            const row = state[el.qualifiedCode];
            const valueInstruction = row.instructionList.find(
              (it) => it.code == "value",
            );
            if (valueInstruction) {
              valueInstruction.returnType = {
                type: "enum",
                values: component.children
                  .filter((el) => el.type == "column")
                  .map((el) => el.code),
              };
              changeInstruction(row, valueInstruction);
            }
          });
      } else if (
        component.children &&
        component.children.filter((el) => el.type === "row").length
      ) {
        component.children
          .filter((el) => el.type === "row")
          .forEach((el) => {
            const row = state[el.qualifiedCode];
            const valueInstruction = row.instructionList.find(
              (it) => it.code == "value",
            );
            if (valueInstruction) {
              valueInstruction.returnType = "string";
              changeInstruction(row, valueInstruction);
            }
          });
      }
  }
  return component;
};

export const refreshListForMultipleChoice = (component, state) => {
  if (
    !component.type ||
    !["mcq", "icon_mcq", "image_mcq", "mcq_array"].includes(component.type)
  ) {
    return;
  }
  switch (component.type) {
    case "image_mcq":
    case "icon_mcq":
    case "mcq":
      let valueInstruction = component.instructionList?.find(
        (it) => it.code == "value",
      );
      if (!valueInstruction) break;
      if (component.children && component.children.length) {
        valueInstruction.returnType = {
          type: "list",
          values: component.children.map((it) => it.code),
        };
        changeInstruction(component, valueInstruction);
      } else {
        valueInstruction.returnType = "list";
        changeInstruction(component, valueInstruction);
      }
      break;
    case "mcq_array":
      if (
        component.children &&
        component.children.length &&
        component.children.filter((el) => el.type == "column").length &&
        component.children.filter((el) => el.type === "row").length
      ) {
        component.children
          .filter((el) => el.type === "row")
          .forEach((el) => {
            const row = state[el.qualifiedCode];
            const valueInstruction = row.instructionList.find(
              (it) => it.code == "value",
            );
            if (valueInstruction) {
              valueInstruction.returnType = {
                type: "list",
                values: component.children
                  .filter((el) => el.type == "column")
                  .map((el) => el.code),
              };
              changeInstruction(row, valueInstruction);
            }
          });
      } else if (
        component.children &&
        component.children.filter((el) => el.type === "row").length
      ) {
        component.children
          .filter((el) => el.type === "row")
          .forEach((el) => {
            const row = state[el.qualifiedCode];
            const valueInstruction = row.instructionList.find(
              (it) => it.code == "value",
            );
            if (valueInstruction) {
              valueInstruction.returnType = "list";
              changeInstruction(row, valueInstruction);
            }
          });
      }
  }
  return component;
};

export const addMaskedValuesInstructions = (
  qualifiedCode,
  component,
  state,
) => {
  if (
    !component.type ||
    ![
      "mcq",
      "image_mcq",
      "icon_mcq",
      "scq",
      "icon_scq",
      "number",
      "image_scq",
      "scq_icon_array",
      "scq_array",
      "mcq_array",
      "date",
      "date_time",
      "time",
    ].includes(component.type)
  ) {
    return;
  }
  switch (component.type) {
    case "date":
      if (component.dateFormat) {
        changeInstruction(component, {
          code: "masked_value",
          isActive: true,
          returnType: "string",
          text: `QlarrScripts.formatSqlDate(${qualifiedCode}.value, "${component.dateFormat}")`,
        });
      } else {
        changeInstruction(component, { code: "masked_value", remove: true });
      }
      break;
    case "time":
      changeInstruction(component, {
        code: "masked_value",
        isActive: true,
        returnType: "string",
        text: `QlarrScripts.formatTime(${qualifiedCode}.value, ${
          component.fullDayFormat || false
        })`,
      });
      break;
    case "number":
      if (component.decimal_separator == ",") {
        changeInstruction(component, {
          code: "masked_value",
          isActive: true,
          returnType: "string",
          text: `${qualifiedCode}.value ? ${qualifiedCode}.value.toString().replace(".",",") : ${qualifiedCode}.value == undefined? "" : ${qualifiedCode}.value`,
        });
      } else {
        changeInstruction(component, { code: "masked_value", remove: true });
      }

      break;
    case "date_time":
      if (component.dateFormat) {
        changeInstruction(component, {
          code: "masked_value",
          isActive: true,
          returnType: "string",
          text: `QlarrScripts.formatSqlDate(${qualifiedCode}.value, "${
            component.dateFormat
          }") + " " + QlarrScripts.formatTime(${qualifiedCode}.value, ${
            component.fullDayFormat || false
          })`,
        });
      } else {
        changeInstruction(component, { code: "masked_value", remove: true });
      }
      break;
    case "image_scq":
    case "icon_scq":
    case "scq":
      if (component.children && component.children.length) {
        let objText =
          "{" +
          component.children
            .map((el) =>
              el.type == "other"
                ? `"${el.code}": ${el.qualifiedCode}Atext.value`
                : `"${el.code}": QlarrScripts.stripTags(${el.qualifiedCode}.label)`,
            )
            .join(",") +
          "}";
        const instruction = {
          code: "masked_value",
          isActive: true,
          returnType: "string",
          text: `${qualifiedCode}.value ? QlarrScripts.safeAccess(${objText},${qualifiedCode}.value) : ''`,
        };
        changeInstruction(component, instruction);
      } else {
        changeInstruction(component, { code: "masked_value", remove: true });
      }
      break;
    case "image_mcq":
    case "icon_mcq":
    case "mcq":
      if (component.children && component.children.length) {
        const text =
          "{" +
          component.children.map((answer) => {
            return `"${answer.code}": ${
              answer.type == "other"
                ? answer.qualifiedCode + "Atext.value"
                : `QlarrScripts.stripTags(${answer.qualifiedCode}.label)`
            }`;
          }) +
          "}";
        const instruction = {
          code: "masked_value",
          isActive: true,
          returnType: "string",
          text: `QlarrScripts.listStrings((${qualifiedCode}.value || []).map(function(el){return QlarrScripts.safeAccess(${text},el)}), Survey.lang)`,
        };
        changeInstruction(component, instruction);
      } else {
        changeInstruction(component, { code: "masked_value", remove: true });
      }
      break;
    case "scq_icon_array":
    case "scq_array":
      if (
        component.children &&
        component.children.length &&
        component.children.filter((el) => el.type == "column").length &&
        component.children.filter((el) => el.type === "row").length
      ) {
        let objText =
          "{" +
          component.children
            .filter((el) => el.type == "column")
            .map(
              (el) =>
                `"${el.code}": QlarrScripts.stripTags(${el.qualifiedCode}.label)`,
            )
            .join(",") +
          "}";

        component.children
          .filter((el) => el.type === "row")
          .forEach((el) => {
            const instruction = {
              code: "masked_value",
              isActive: true,
              returnType: "string",
              text: `${el.qualifiedCode}.value ? QlarrScripts.safeAccess(${objText},${el.qualifiedCode}.value) : ''`,
            };
            changeInstruction(state[el.qualifiedCode], instruction);
          });
      } else if (
        component.children &&
        component.children.filter((el) => el.type === "row").length
      ) {
        component.children
          .filter((el) => el.type === "row")
          .forEach((el) => {
            changeInstruction(state[el.qualifiedCode], {
              code: "masked_value",
              remove: true,
            });
          });
      }
      break;
    case "mcq_array":
      if (
        component.children &&
        component.children.length &&
        component.children.filter((el) => el.type == "column").length &&
        component.children.filter((el) => el.type === "row").length
      ) {
        let objText =
          "{" +
          component.children
            .filter((el) => el.type == "column")
            .map(
              (el) =>
                `"${el.code}": QlarrScripts.stripTags(${el.qualifiedCode}.label)`,
            )
            .join(",") +
          "}";

        component.children
          .filter((el) => el.type === "row")
          .forEach((el) => {
            const instruction = {
              code: "masked_value",
              isActive: true,
              returnType: "string",

              text: `QlarrScripts.listStrings((${el.qualifiedCode}.value || []).map(function(el){return QlarrScripts.safeAccess(${objText},el)}), Survey.lang)`,
            };
            changeInstruction(state[el.qualifiedCode], instruction);
          });
      } else if (
        component.children &&
        component.children.filter((el) => el.type === "row").length
      ) {
        component.children
          .filter((el) => el.type === "row")
          .forEach((el) => {
            changeInstruction(state[el.qualifiedCode], {
              code: "masked_value",
              remove: true,
            });
          });
      }
  }
  return component;
};

export const changeInstruction = (componentState, instruction) => {
  if (typeof componentState.instructionList === "undefined") {
    componentState.instructionList = [];
  }
  if (instruction.remove) {
    removeInstruction(componentState, instruction.code);
  } else {
    editInstruction(componentState, instruction);
  }
};

// there is always an assumption that instructionList exists!!!
export const removeInstruction = (componentState, code) => {
  if (componentState.instructionList.length) {
    const index = componentState.instructionList.findIndex(
      (el) => el.code === code,
    );
    if (index < 0) {
      return;
    } else if (componentState.instructionList.length == 1) {
      componentState.instructionList = [];
    } else {
      componentState.instructionList.splice(index, 1);
    }
  }
};

export const addQuestionValueInstruction = (question) => {
  if (!question.instructionList) {
    question.instructionList = [];
  }
  let type = question.type;
  switch (type) {
    case "text":
    case "paragraph":
    case "email":
    case "autocomplete":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "string",
        text: "",
      });

      break;
    case "number":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "double",
        text: "",
      });
      break;
    case "barcode":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "string",
        text: "",
      });
      editInstruction(question, {
        code: "mode",
        isActive: false,
        returnType: "string",
        text: "offline",
      });
      break;
    case "scq":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "string",
        text: "",
      });
      break;
    case "icon_mcq":
    case "image_mcq":
    case "mcq":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "list",
        text: "",
      });
      break;
    case "icon_scq":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "string",
        text: "",
      });
      break;
    case "image_scq":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "string",
        text: "",
      });
      break;
    case "nps":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "int",
        text: "",
      });
      break;
    case "file_upload":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "file",
        text: "",
      });
      break;
    case "signature":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "file",
        text: "",
      });
      break;
    case "photo_capture":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "file",
        text: "",
      });
      editInstruction(question, {
        code: "mode",
        isActive: false,
        returnType: "string",
        text: "offline",
      });
      break;
    case "video_capture":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "file",
        text: "",
      });
      editInstruction(question, {
        code: "mode",
        isActive: false,
        returnType: "string",
        text: "offline",
      });
      break;
    case "date":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "date",
        text: "",
      });
      break;
    case "date_time":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "date",
        text: "",
      });
      break;
    case "time":
      editInstruction(question, {
        code: "value",
        isActive: false,
        returnType: "date",
        text: "",
      });
      break;
    case "text_display":
    case "video_display":
    case "image_display":
    case "scq_icon_array":
    case "scq_array":
    case "mcq_array":
    case "image_ranking":
    case "ranking":
    default:
      break;
  }
};

export const addAnswerInstructions = (
  state,
  answer,
  parentCode,
  questionCode,
) => {
  const questionType = state[questionCode].type;
  const type = answer.type;
  const valueInstruction = {
    code: "value",
    isActive: false,
    returnType:
      questionType == "ranking" ||
      questionType == "nps" ||
      questionType == "image_ranking"
        ? "int"
        : questionType == "mcq_array"
          ? "list"
          : "string",
    text: "",
  };
  switch (type) {
    case "column":
      break;
    case "row":
      changeInstruction(answer, valueInstruction);
      break;
    case "other":
      if (questionType !== "scq") {
        changeInstruction(answer, valueInstruction);
      }
      break;
    case "other_text":
      changeInstruction(answer, {
        code: "value",
        isActive: false,
        returnType: "string",
        text: "",
      });
      changeInstruction(answer, {
        code: "conditional_relevance",
        isActive: true,
        returnType: "boolean",
        text:
          questionType === "scq"
            ? `${questionCode}.value === 'Aother'`
            : `(${questionCode}.value || []).indexOf('Aother') > -1`,
      });
      break;
    default:
      if (
        ![
          "scq",
          "icon_scq",
          "image_scq",
          "mcq",
          "icon_mcq",
          "image_mcq",
        ].includes(questionType)
      ) {
        changeInstruction(answer, valueInstruction);
      }
      break;
  }
};

const addValidationEquation = (state, qualifiedCode, rule) => {
  const component = state[qualifiedCode];
  const validationInstruction = validationEquation(
    qualifiedCode,
    component,
    rule,
    component["validation"][rule],
  );
  changeInstruction(component, validationInstruction);
};

// there is always an assumption that instructionList exists!!!
const editInstruction = (componentState, instruction) => {
  const index = componentState.instructionList.findIndex(
    (el) => el.code === instruction.code,
  );
  if (index < 0) {
    componentState.instructionList.push(instruction);
  } else {
    componentState.instructionList[index] = instruction;
  }
};

const scqSkipEquations = (qualifiedCode, component) => {
  const skipLogic = component.skip_logic || [];
  const instructionList = [];

  // Mark old per-answer instructions for removal (backwards compatibility cleanup)
  component.children?.forEach((el) => {
    instructionList.push({ code: "skip_to_on_" + el.code, remove: true });
  });

  // Remove all skip_to_auto# instructions (they will be recreated below)
  component.instructionList?.forEach((inst) => {
    if (inst.code.match(/^skip_to_auto\d+$/)) {
      instructionList.push({ code: inst.code, remove: true });
    }
  });

  // Generate new instructions from array-based skip_logic
  skipLogic.forEach((rule, index) => {
    const instructionCode = "skip_to_auto" + (index + 1);

    if (!rule.condition?.length || !rule.skipTo) {
      instructionList.push({ code: instructionCode, remove: true });
      return;
    }

    // Build condition using includes: ["A1", "A2"].includes(Q1.value)
    const conditionText = `[${rule.condition.map((code) => `"${code}"`).join(", ")}].includes(${qualifiedCode}.value)`;

    instructionList.push({
      code: instructionCode,
      text: conditionText,
      returnType: "boolean",
      isActive: true,
      skipToComponent: rule.skipTo,
      toEnd: rule.toEnd || false,
      disqualify: rule.disqualify || false,
    });
  });

  return instructionList;
};

const validationEquation = (qualifiedCode, component, key, validation) => {
  if (
    !validation.isActive ||
    (key == "validation_not_contains" && !validation.not_contains)
  ) {
    return { code: key, remove: true };
  }
  let instructionText = "";
  switch (key) {
    case "validation_required":
      instructionText = requiredText(qualifiedCode, component);
      return booleanActiveInstruction(key, instructionText);
    case "validation_min_char_length":
      instructionText = `${qualifiedCode}.value.length >= ${validation.min_length || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_one_response_per_col":
      instructionText = `QlarrScripts.hasDuplicates([${component.children
        .filter((el) => el.type == "row")
        .map((el) => el.qualifiedCode + ".value")}].filter(x=>x))`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_max_char_length":
      instructionText = `${qualifiedCode}.value.length <= ${validation.max_length || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_contains":
      instructionText = `${qualifiedCode}.value.includes("${validation.contains}")`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_not_contains":
      instructionText = `!${qualifiedCode}.value.includes("${validation.not_contains}")`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_file_types":
      const mimes = fileTypesToMimesArray(validation.fileTypes);
      instructionText = `[${mimes
        .map((el) => '"' + el + '"')
        .join(
          ",",
        )}].includes(QlarrScripts.safeAccess(${qualifiedCode}.value,"type"))`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_max_file_size":
      instructionText = `QlarrScripts.safeAccess(${qualifiedCode}.value,"size")/ 1024 < ${validation.max_size}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_pattern":
      if (!isValidRegex(validation.pattern)) {
        return { code: key, remove: true };
      }
      instructionText = `(new RegExp("${validation.pattern}").test(${qualifiedCode}.value))`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_pattern_email":
      instructionText = `/^\\w+@[a-zA-Z_]+?\\.[a-zA-Z]{2,3}$/.test(${qualifiedCode}.value)`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_max_word_count":
      instructionText = `QlarrScripts.wordCount(${qualifiedCode}.value) <= ${
        validation.max_count || 0
      }`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_min_word_count":
      instructionText = `QlarrScripts.wordCount(${qualifiedCode}.value) >= ${
        validation.min_count || 0
      }`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_between":
      instructionText =
        `${qualifiedCode}.value > ${validation.lower_limit || 0} ` +
        `&& ${qualifiedCode}.value < ${validation.upper_limit || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_not_between":
      instructionText =
        `${qualifiedCode}.value < ${validation.lower_limit || 0} ` +
        `|| ${qualifiedCode}.value > ${validation.upper_limit || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_lt":
      instructionText = `${qualifiedCode}.value < ${validation.number || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_lte":
      instructionText = `${qualifiedCode}.value <= ${validation.number || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_gt":
      instructionText = `${qualifiedCode}.value > ${validation.number || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_gte":
      instructionText = `${qualifiedCode}.value >= ${validation.number || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_equals":
      instructionText = `${qualifiedCode}.value == ${validation.number || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_not_equal":
      instructionText = `${qualifiedCode}.value != ${validation.number || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_min_option_count":
      instructionText =
        `(${qualifiedCode}.value || []).length ` +
        `>= ${validation.min_count || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_min_ranking_count":
      instructionText =
        `[${component.children.map(
          (answer) => answer.qualifiedCode + ".value",
        )}].filter(x=>x).length ` + `>= ${validation.min_count || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_max_option_count":
      instructionText =
        `(${qualifiedCode}.value || []).length ` +
        `<= ${validation.max_count || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_max_ranking_count":
      instructionText =
        `[${component.children.map(
          (answer) => answer.qualifiedCode + ".value",
        )}].filter(x=>x).length ` + `<= ${validation.max_count || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_option_count":
      instructionText =
        `(${qualifiedCode}.value || []).length ` +
        `== ${validation.count || 0}`;
      return booleanActiveInstruction(key, instructionText);
    case "validation_ranking_count":
      instructionText =
        `[${component.children.map(
          (answer) => answer.qualifiedCode + ".value",
        )}].filter(x=>x).length ` + `== ${validation.count || 0}`;
      return booleanActiveInstruction(key, instructionText);
    default:
      break;
  }
};

const booleanActiveInstruction = (key, instructionText) => {
  return {
    code: key,
    text: instructionText,
    isActive: true,
    returnType: "boolean",
  };
};

const requiredText = (qualifiedCode, component) => {
  if (
    component.type == "file_upload" ||
    component.type == "signature" ||
    component.type == "photo_capture" ||
    component.type == "video_capture"
  ) {
    return `QlarrScripts.isNotVoid(${qualifiedCode}.value) || QlarrScripts.safeAccess(${qualifiedCode}.value,"size") || QlarrScripts.safeAccess(${qualifiedCode}.value,"stored_filename")`;
  } else if (
    component.type == "scq_array" ||
    component.type == "scq_icon_array"
  ) {
    const rows = component.children.filter((child) => child.type == "row");
    return (
      `[${rows.map(
        (answer) => answer.qualifiedCode + ".value",
      )}].filter(x=>x).length ` +
      ` == ` +
      rows.length
    );
  } else if (component.type == "mcq_array") {
    const rows = component.children.filter((child) => child.type == "row");
    return (
      `[${rows.map(
        (answer) => answer.qualifiedCode + ".value",
      )}].filter(x=>x && x.length > 0).length ` +
      ` == ` +
      rows.length
    );
  } else if (component.type == "multiple_text") {
    const rows = component.children;
    return (
      `[${rows.map(
        (answer) => answer.qualifiedCode + ".value",
      )}].filter(x=>x).length ` +
      ` == ` +
      rows.length
    );
  } else {
    return `QlarrScripts.isNotVoid(${qualifiedCode}.value)`;
  }
};

const isValidRegex = (regex) => {
  if (!regex) {
    return false;
  }
  try {
    new RegExp(regex);
  } catch (e) {
    return false;
  }
  return true;
};

export const updateRandomByRule = (
  componentState,
  randomRule,
  initialSetup = false,
) => {
  if (
    ["randomize_questions", "randomize_groups", "randomize_options"].indexOf(
      randomRule,
    ) > -1
  ) {
    const childCodes = componentState.children
      ?.filter((it) =>
        it.groupType?.toLowerCase() != "end" && initialSetup
          ? ["other", "none", "all"].indexOf(it.type?.toLowerCase()) == -1
          : true,
      )
      ?.map((it) => it.code);
    if (childCodes.length == 0 || !componentState[randomRule]) {
      componentState[randomRule] = undefined;
      removeInstruction(componentState, "random_group");
      return;
    }
    let instruction;
    if (initialSetup) {
      instruction = {
        code: "random_group",
        groups: [
          { codes: childCodes, randomOption: componentState[randomRule] },
        ],
      };
    } else {
      instruction = instructionByCode(componentState, "random_group");
      instruction.groups = instruction.groups
        .map((group) => {
          const newCodes = group.codes.filter((code) =>
            childCodes.includes(code),
          );
          if (newCodes.length > 0) {
            group.codes = newCodes;
            return group;
          } else {
            return undefined;
          }
        })
        .filter((group) => group !== undefined);
    }
    if (instruction.groups.length == 0) {
      componentState[randomRule] = undefined;
      removeInstruction(componentState, "random_group");
    } else {
      changeInstruction(componentState, instruction);
    }
  } else if (["randomize_rows"].indexOf(randomRule) > -1) {
    const childCodes = componentState.children
      ?.filter((child) => child.type == "row")
      ?.map((it) => it.code);

    const randomInstruction = instructionByCode(componentState, "random_group");
    const groups = randomInstruction?.groups || [];
    const groupsWithColAnswers = groups.filter((group) => {
      return !group.codes.some((item) => childCodes.includes(item));
    });
    if (childCodes.length == 0 || !componentState[randomRule]) {
      componentState[randomRule] = undefined;
      if (groupsWithColAnswers.length == 0) {
        removeInstruction(componentState, "random_group");
      } else {
        changeInstruction(componentState, {
          code: "random_group",
          groups: groupsWithColAnswers,
        });
      }
      return;
    }
    if (initialSetup) {
      groupsWithColAnswers.push({
        codes: childCodes,
        randomOption: componentState[randomRule],
      });
      const updated = {
        code: "random_group",
        groups: groupsWithColAnswers,
      };
      changeInstruction(componentState, updated);
    } else {
      const childCodesIncluded = groups
        .filter((group) => {
          return group.codes.some((item) => childCodes.includes(item));
        })
        .map((group) => group.codes.filter((item) => childCodes.includes(item)))
        .flat();
      if (childCodesIncluded.length > 0) {
        groupsWithColAnswers.push({
          codes: childCodesIncluded,
          randomOption: componentState[randomRule],
        });
        const updated = {
          code: "random_group",
          groups: groupsWithColAnswers,
        };
        changeInstruction(componentState, updated);
      } else {
        componentState[randomRule] = undefined;
        const updated = {
          code: "random_group",
          groups: groupsWithColAnswers,
        };
        changeInstruction(componentState, updated);
      }
    }
  } else if (["randomize_columns"].indexOf(randomRule) > -1) {
    const childCodes = componentState.children
      ?.filter((child) => child.type == "column")
      ?.map((it) => it.code);

    const randomInstruction = instructionByCode(componentState, "random_group");
    const groups = randomInstruction?.groups || [];
    const groupsWithRowAnswers = groups.filter((group) => {
      return !group.codes.some((item) => childCodes.includes(item));
    });
    if (childCodes.length == 0 || !componentState[randomRule]) {
      componentState[randomRule] = undefined;
      if (groupsWithRowAnswers.length == 0) {
        removeInstruction(componentState, "random_group");
      } else {
        changeInstruction(componentState, {
          code: "random_group",
          groups: groupsWithRowAnswers,
        });
      }
      return;
    }
    if (initialSetup) {
      groupsWithRowAnswers.push({
        codes: childCodes,
        randomOption: componentState[randomRule],
      });
      const updated = {
        code: "random_group",
        groups: groupsWithRowAnswers,
      };
      changeInstruction(componentState, updated);
    } else {
      const childCodesIncluded = groups
        .filter((group) => {
          return group.codes.some((item) => childCodes.includes(item));
        })
        .map((group) => group.codes.filter((item) => childCodes.includes(item)))
        .flat();
      if (childCodesIncluded.length > 0) {
        groupsWithRowAnswers.push({
          codes: childCodesIncluded,
          randomOption: componentState[randomRule],
        });
        const updated = {
          code: "random_group",
          groups: groupsWithRowAnswers,
        };
        changeInstruction(componentState, updated);
      } else {
        componentState[randomRule] = undefined;
        const updated = {
          code: "random_group",
          groups: groupsWithRowAnswers,
        };
        changeInstruction(componentState, updated);
      }
    }
  }
};

// v1 prioritization uses equal weights — a priority group is just the member
// codes plus a "show N of M" limit (1..size-1). Build one from a code list.
const priorityGroupFromCodes = (codes, limit) => ({
  weights: codes.map((code) => ({ code })),
  limit: Math.min(Math.max(limit ?? codes.length - 1, 1), codes.length - 1),
});

const writePriorities = (componentState, rule, priorities) => {
  if (priorities.length === 0) {
    componentState[rule] = undefined;
    removeInstruction(componentState, "priority_groups");
  } else {
    changeInstruction(componentState, { code: "priority_groups", priorities });
  }
};

// Mirrors updateRandomByRule, but writes the `priority_groups` instruction
// ({ priorities: [{ weights:[{code}], limit }] }). Single-group rules
// (questions/groups/options) own the whole instruction; rows/columns coexist
// as separate groups in the same instruction (one per axis).
export const updatePriorityByRule = (
  componentState,
  priorityRule,
  initialSetup = false,
) => {
  if (
    ["prioritise_questions", "prioritise_groups", "prioritise_options"].indexOf(
      priorityRule,
    ) > -1
  ) {
    const isGroups = priorityRule === "prioritise_groups";
    const childCodes =
      componentState.children
        ?.filter((it) => {
          const groupType = it.groupType?.toLowerCase();
          // engine rejects welcome/end groups inside a priority group
          if (groupType === "end" || (isGroups && groupType === "welcome")) {
            return false;
          }
          // on initial setup, drop special answer types (mirror randomization)
          return initialSetup
            ? ["other", "none", "all"].indexOf(it.type?.toLowerCase()) === -1
            : true;
        })
        ?.map((it) => it.code) || [];

    // a valid priority group needs at least 2 items (limit must be 1..size-1)
    if (childCodes.length < 2 || !componentState[priorityRule]) {
      componentState[priorityRule] = undefined;
      removeInstruction(componentState, "priority_groups");
      return;
    }

    if (initialSetup) {
      changeInstruction(componentState, {
        code: "priority_groups",
        priorities: [priorityGroupFromCodes(childCodes)],
      });
      return;
    }

    // prune existing group(s) to surviving child codes and re-clamp the limit
    const instruction = instructionByCode(componentState, "priority_groups");
    if (!instruction) {
      componentState[priorityRule] = undefined;
      return;
    }
    const priorities = (instruction.priorities || [])
      .map((group) => {
        const codes = (group.weights || [])
          .map((w) => w.code)
          .filter((code) => childCodes.includes(code));
        return codes.length >= 2
          ? priorityGroupFromCodes(codes, group.limit)
          : undefined;
      })
      .filter((group) => group !== undefined);
    writePriorities(componentState, priorityRule, priorities);
  } else if (
    priorityRule === "prioritise_rows" ||
    priorityRule === "prioritise_columns"
  ) {
    const childType = priorityRule === "prioritise_rows" ? "row" : "column";
    const childCodes =
      componentState.children
        ?.filter((c) => c.type === childType)
        ?.map((it) => it.code) || [];
    const instruction = instructionByCode(componentState, "priority_groups");
    const priorities = instruction?.priorities || [];
    // groups for the OTHER axis (no overlap with this axis's children) are kept
    const otherGroups = priorities.filter(
      (group) => !(group.weights || []).some((w) => childCodes.includes(w.code)),
    );

    if (childCodes.length < 2 || !componentState[priorityRule]) {
      componentState[priorityRule] = undefined;
      writePriorities(componentState, priorityRule, otherGroups);
      return;
    }

    if (initialSetup) {
      writePriorities(componentState, priorityRule, [
        ...otherGroups,
        priorityGroupFromCodes(childCodes),
      ]);
      return;
    }

    // prune this axis's existing group to surviving codes, keep the other axis
    const axisGroup = priorities.find((group) =>
      (group.weights || []).some((w) => childCodes.includes(w.code)),
    );
    const includedCodes = (axisGroup?.weights || [])
      .map((w) => w.code)
      .filter((code) => childCodes.includes(code));
    if (includedCodes.length >= 2) {
      writePriorities(componentState, priorityRule, [
        ...otherGroups,
        priorityGroupFromCodes(includedCodes, axisGroup.limit),
      ]);
    } else {
      componentState[priorityRule] = undefined;
      writePriorities(componentState, priorityRule, otherGroups);
    }
  }
};

const getQuestionType = (state, code) => {
  const match = code.match(/^Q[a-z0-9_]+/);
  const captured = match ? match[0] : null;
  if (captured) {
    return state[captured].type;
  } else {
    return null;
  }
};

export const conditionalRelevanceEquation = (logic, rule, state) => {
  const code = "conditional_relevance";
  if (rule == "show_always") {
    return { code, remove: true };
  } else if (rule == "hide_always") {
    return {
      code,
      text: "false",
      isActive: false,
      returnType: "boolean",
    };
  }
  const text = jsonToJs(
    logic,
    false,
    (code) => state[code].type,
    (code) => getQuestionType(state, code),
  );
  // If no valid logic yet (empty text), treat as "show_always" to avoid validation errors
  if (!text) {
    return { code, remove: true };
  }
  if (rule == "show_if") {
    return { code, text, isActive: true, returnType: "boolean" };
  } else if (rule == "hide_if") {
    return {
      code,
      text: `!(${text})`,
      isActive: true,
      returnType: "boolean",
    };
  } else {
    throw "WTF";
  }
};

const jsonToJs = (json, nested, getComponentType, getQuestionType) => {
  if (!json || typeof json !== "object") {
    return "";
  }
  const key = Object.keys(json)[0];
  const value = json[key];
  switch (key) {
    case "and":
      return wrapIfNested(
        nested,
        value
          .map((el) => jsonToJs(el, true, getComponentType, getQuestionType))
          .join(" && "),
      );
    case "or":
      return wrapIfNested(
        nested,
        value
          .map((el) => jsonToJs(el, true, getComponentType, getQuestionType))
          .join(" || "),
      );
    case "!":
      return (
        "!" +
        wrapIfNested(
          nested,
          jsonToJs(value, true, getComponentType, getQuestionType) +
            (nested ? ")" : ""),
        )
      );
    case "is_relevant":
      return `${capture(value)}.relevance`;
    case "is_not_relevant":
      return `!${capture(value)}.relevance`;
    case "is_online":
      return `Survey.mode=="online"`;
    case "is_offline":
      return `Survey.mode=="offline"`;
    case "is_valid":
      return `${capture(value)}.validity`;
    case "is_not_valid":
      return `!${capture(value)}.validity`;
    case "is_empty":
      const qCode1 = capture(value);
      if (
        ["file_upload", "signature", "photo_capture", "video_capture"].indexOf(
          getComponentType(qCode1),
        ) > -1
      ) {
        return wrapIfNested(
          nested,
          `Object.keys(${qCode1}.value).length == 0 || !QlarrScripts.safeAccess(${qCode1}.value,"size") || !QlarrScripts.safeAccess(${qCode1}.value,"stored_filename")`,
        );
      } else {
        return `QlarrScripts.isVoid(${capture(qCode1)}.value)`;
      }
    case "is_not_empty":
      const qCode = capture(value);
      if (
        ["file_upload", "signature", "photo_capture", "video_capture"].indexOf(
          getComponentType(qCode),
        ) > -1
      ) {
        return wrapIfNested(
          nested,
          `Object.keys(${qCode}.value).length > 0 && QlarrScripts.safeAccess(${qCode}.value,"size") && QlarrScripts.safeAccess(${qCode}.value,"stored_filename")`,
        );
      } else {
        return `QlarrScripts.isNotVoid(${capture(value)}.value)`;
      }
    case "==":
    case "!=":
    case "<":
    case "<=":
    case ">":
    case ">=":
    case "between":
    case "not_between":
      let type = getComponentType(capture(value[0]));
      let leftOperand =
        type == "date" || type == "date_time" || type == "time"
          ? `QlarrScripts.sqlDateTimeToDate(${capture(value[0])}.value)`
          : `${capture(value[0])}.value`;
      if (["==", "!=", "<", "<=", ">", ">="].includes(key)) {
        return `${leftOperand}${key}${capture(value[1], type)}`;
      } else if (key == "between") {
        return wrapIfNested(
          nested,
          `(${leftOperand}>=${capture(
            value[1],
            type,
          )} && ${leftOperand}<=${capture(value[2], type)})`,
        );
      } else if (key == "not_between") {
        return wrapIfNested(
          nested,
          `(${leftOperand}<${capture(
            value[1],
            type,
          )} || ${leftOperand}>${capture(value[2], type)})`,
        );
      } else {
        throw "WTF";
      }
    case "startsWith":
      return wrapIfNested(
        nested,
        `${capture(value[0])}.value?.startsWith(${capture(value[1])})`,
      );
    case "endsWith":
      return wrapIfNested(
        nested,
        `${capture(value[0])}.value?.endsWith(${capture(value[1])})`,
      );
    case "contains":
      return wrapIfNested(
        nested,
        `${capture(value[0])}.value?.indexOf(${capture(value[1])}) > -1`,
      );
    case "not_contains":
      return wrapIfNested(
        nested,
        `!${capture(value[0])}.value || ${capture(
          value[0],
        )}.value?.indexOf(${capture(value[1])}) == -1`,
      );
    case "in":
      const code = capture(value[0]);
      if (code == "survey_lang") {
        return `[${value[1].map(
          (el) => '"' + el + '"',
        )}].indexOf(Survey.lang) !== -1`;
      } else if (getComponentType(code) == "nps") {
        return `[${value[1].map((el) => +el)}].indexOf(${code}.value) !== -1`;
      } else if (
        ["mcq", "image_mcq", "icon_mcq"].indexOf(getComponentType(code)) > -1 ||
        getQuestionType(code) == "mcq_array"
      ) {
        return `[${value[1].map(
          (el) => "'" + el + "'",
        )}].filter((el) => ${code}.value?.indexOf(el) > -1).length > 0`;
      } else {
        return `[${value[1].map(
          (el) => '"' + el + '"',
        )}].indexOf(${code}.value) !== -1`;
      }
    case "not_in":
      const code1 = capture(value[0]);
      if (code1 == "survey_lang") {
        return `[${value[1].map(
          (el) => '"' + el + '"',
        )}].indexOf(Survey.lang) == -1`;
      } else if (getComponentType(code1) == "nps") {
        return `[${value[1].map((el) => +el)}].indexOf(${code1}.value) == -1`;
      } else if (
        ["mcq", "image_mcq", "icon_mcq"].indexOf(getComponentType(code1)) > -1
      ) {
        return `[${value[1].map(
          (el) => "'" + el + "'",
        )}].filter((el) => ${code1}.value?.indexOf(el) > -1).length == 0`;
      } else {
        return `[${value[1].map(
          (el) => '"' + el + '"',
        )}].indexOf(${code1}.value) == -1`;
      }

    default:
      return "";
  }
};

const wrapIfNested = (nested, text) => {
  return (nested ? "(" : "") + text + (nested ? ")" : "");
};

const capture = (value, type) => {
  if (type == "time") {
    return `QlarrScripts.sqlDateTimeToDate(\"1970-01-01 ${integerToTime(
      value,
    )}\")`;
  } else if (
    typeof value === "object" &&
    Object.prototype.toString.call(value) === "[object Date]"
  ) {
    return type == "date_time"
      ? `QlarrScripts.sqlDateTimeToDate(\"${toSqlDateTime(value)}\")`
      : `QlarrScripts.sqlDateTimeToDate(\"${toSqlDateTimeIgnoreTime(value)}\")`;
  }
  if (typeof value === "object") {
    return value[Object.keys(value)[0]];
  } else if (typeof value === "string") {
    return '"' + value + '"';
  } else {
    return value;
  }
};

const integerToTime = (time) => {
  let hours = Math.floor(time / 3600);
  let hoursString = hours >= 10 && hours <= 23 ? "" + hours : "0" + hours;
  let minutes = (time % 3600) / 60;
  let minutesString =
    minutes >= 10 && minutes <= 59 ? "" + minutes : "0" + minutes;
  return hoursString + ":" + minutesString + ":00";
};

const toSqlDateTime = (date) => {
  return (
    date.getFullYear() +
    "-" +
    ("00" + (date.getMonth() + 1)).slice(-2) +
    "-" +
    ("00" + date.getDate()).slice(-2) +
    " " +
    ("00" + date.getHours()).slice(-2) +
    ":" +
    ("00" + date.getMinutes()).slice(-2) +
    ":" +
    ("00" + date.getSeconds()).slice(-2)
  );
};

const toSqlDateTimeIgnoreTime = (date) => {
  return (
    date.getFullYear() +
    "-" +
    ("00" + (date.getMonth() + 1)).slice(-2) +
    "-" +
    ("00" + date.getDate()).slice(-2) +
    " 00:00:00"
  );
};

export const instructionByCode = (component, code) =>
  component.instructionList
    ? component.instructionList.find((el) => el.code === code)
    : undefined;

export const fileTypesToMimesArray = (fileTypes) => {
  let accepted = [];
  fileTypes?.forEach((el) => {
    accepted = accepted.concat(acceptedFileTypes(el));
  });
  return accepted;
};

const acceptedFileTypes = (fileType) => {
  switch (fileType) {
    case "presentation":
      return [
        "application/mspowerpoint",
        "application/vnd.google-apps.presentation",
        "application/vnd.ms-powerpoint",
        "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
        "application/vnd.ms-powerpoint.presentation.macroenabled.12",
        "application/vnd.ms-powerpoint.slideshow.macroEnabled.12",
        "application/vnd.ms-powerpoint.slideshow.macroenabled.12",
        "application/vnd.ms-powerpoint.template.macroEnabled.12",
        "application/vnd.ms-powerpoint.template.macroenabled.12",
        "application/vnd.oasis.opendocument.presentation",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
        "application/vnd.openxmlformats-officedocument.presentationml.template",
      ];

    case "document":
      return [
        "application/vnd.google-apps.document",
        "application/vnd.ms-word",
        "application/vnd.ms-word.document.macroEnabled.12",
        "application/vnd.ms-word.document.macroenabled.12",
        "application/vnd.ms-word.template.macroEnabled.12",
        "application/vnd.ms-word.template.macroenabled.12",
        "application/vnd.oasis.opendocument.text",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
        "text/plain",
        "application/msword",
      ];

    case "spreadsheet":
      return [
        "application/msexcel",
        "application/vnd.google-apps.spreadsheet",
        "application/vnd.ms-excel",
        "application/vnd.ms-excel.sheet.macroEnabled.12",
        "application/vnd.ms-excel.sheet.macroenabled.12",
        "application/vnd.ms-excel.template.macroEnabled.12",
        "application/vnd.ms-excel.template.macroenabled.12",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
        "text/csv",
      ];

    case "pdf":
      return ["application/pdf"];

    case "image":
      return [
        "image/bmp",
        "image/gif",
        "image/heic",
        "image/heif",
        "image/jpeg",
        "image/png",
        "image/tiff",
        "image/vnd.microsoft.icon",
        "image/webp",
        "image/x-ms-bmp",
      ];

    case "video":
      return [
        "application/vnd.google-apps.video",
        "video/3gpp",
        "video/3gpp2",
        "video/avi",
        "video/flv",
        "video/mp2t",
        "video/mp4",
        "video/mp4v-es",
        "video/mpeg",
        "video/ogg",
        "video/quicktime",
        "video/vnd.mts",
        "video/webm",
        "video/x-flv",
        "video/x-m4v",
        "video/x-matroska",
        "video/x-ms-asf",
        "video/x-ms-wm",
        "video/x-ms-wmv",
        "video/x-ms-wvx",
        "video/x-msvideo",
        "video/x-quicktime",
      ];

    case "audio":
      return [
        "application/vnd.google-apps.audio",
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/midi",
        "audio/x-mid",
        "audio/x-midi",
        "audio/wav",
        "audio/x-wav",
        "audio/vnd.wav",
        "audio/flac",
        "audio/ogg",
        "audio/vorbis",
      ];
  }
};

export const processValidation = (state, code, rule, modifyEquation = true) => {
  const component = state[code];
  if (component.designErrors && component.designErrors.length) {
    component.validation[rule].isActive = false;
    removeInstruction(component, rule);
    return;
  }
  component.validation[rule] = cleanupValidationData(
    component,
    rule,
    component.validation[rule],
  );
  // we have this special situation that the SCQ array validation is copied to its children
  // This is specifically important when an SCQ array is implemented at SCQ in smaller screens
  if (
    (component.type == "scq_array" ||
      component.type == "mcq_array" ||
      component.type == "multiple_text" ||
      component.type == "scq_icon_array") &&
    rule == "validation_required"
  ) {
    component.children
      .filter(
        (child) => child.type == "row" || component.type == "multiple_text",
      )
      .forEach((row) => {
        const child = state[row.qualifiedCode];
        if (!child.validation) {
          child.validation = {};
        }
        child.validation[rule] = component.validation[rule];
        addValidationEquation(state, row.qualifiedCode, rule);
      });
    return;
  }
  if (modifyEquation) {
    addValidationEquation(state, code, rule);
  }
};

const cleanupValidationData = (component, key, validation) => {
  switch (key) {
    case "validation_required":
    case "validation_one_response_per_col":
    case "validation_pattern_email":
    case "validation_contains":
    case "validation_not_contains":
    case "validation_pattern":
    case "validation_max_word_count":
    case "validation_min_word_count":
    case "validation_between":
    case "validation_not_between":
    case "validation_lt":
    case "validation_lte":
    case "validation_gt":
    case "validation_gte":
    case "validation_equals":
    case "validation_not_equal":
      return validation;
    case "validation_min_char_length":
      return {
        ...validation,
        min_length: Math.min(component.maxChars || 30, validation.min_length),
      };
    case "validation_max_char_length":
      return {
        ...validation,
        max_length: Math.min(component.maxChars || 30, validation.max_length),
      };
    case "validation_min_ranking_count":
    case "validation_min_option_count":
      return {
        ...validation,
        min_count: Math.min(component.children.length, validation.min_count),
      };
    case "validation_max_ranking_count":
    case "validation_max_option_count":
      return {
        ...validation,
        max_count: Math.min(component.children.length, validation.max_count),
      };
    case "validation_ranking_count":
    case "validation_option_count":
      return {
        ...validation,
        count: Math.min(component.children.length, validation.count),
      };
    default:
      return validation;
  }
};
