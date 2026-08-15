export const createQuestion = (type, qId, lang) => {
  let code = `Q${qId}`;
  let returnObj = {};
  let state = { type };
  let newQuestion = { code: `Q${qId}`, qualifiedCode: `Q${qId}`, type };
  returnObj[code] = state;
  returnObj.question = newQuestion;
  switch (type) {
    case "text":
      state.maxChars = 30;
      state.showHint = true;
      break;
    case "number":
      state.maxChars = 15;
      state.showHint = true;
      break;
    case "email":
      state.maxChars = 30;
      state.showHint = true;
      state.validation = {
        validation_pattern_email: {
          isActive: true,
        },
      };

      break;
    case "paragraph":
      state.showHint = true;
      break;
    case "scq":
      returnObj[`Q${qId}A1`] = {};
      returnObj[`Q${qId}A2`] = {};
      returnObj[`Q${qId}A3`] = {};
      state.children = [
        {
          code: "A1",
          qualifiedCode: `Q${qId}A1`,
        },
        {
          code: "A2",
          qualifiedCode: `Q${qId}A2`,
        },
        {
          code: "A3",
          qualifiedCode: `Q${qId}A3`,
        },
      ];

      break;
    case "icon_scq":
      state.columns = 3;
      state.iconSize = "150";
      state.spacing = 8;
      returnObj[`Q${qId}A1`] = {};
      returnObj[`Q${qId}A2`] = {};
      returnObj[`Q${qId}A3`] = {};
      state.children = [
        {
          code: "A1",
          qualifiedCode: `Q${qId}A1`,
        },
        {
          code: "A2",
          qualifiedCode: `Q${qId}A2`,
        },
        {
          code: "A3",
          qualifiedCode: `Q${qId}A3`,
        },
      ];

      break;
    case "image_scq":
      state.columns = 3;
      state.imageAspectRatio = 1;
      state.spacing = 8;
      returnObj[`Q${qId}A1`] = {};
      returnObj[`Q${qId}A2`] = {};
      returnObj[`Q${qId}A3`] = {};
      state.children = [
        {
          code: "A1",
          qualifiedCode: `Q${qId}A1`,
        },
        {
          code: "A2",
          qualifiedCode: `Q${qId}A2`,
        },
        {
          code: "A3",
          qualifiedCode: `Q${qId}A3`,
        },
      ];

      break;
    case "multiple_text":
      returnObj[`Q${qId}A1`] = {};
      returnObj[`Q${qId}A2`] = {};
      returnObj[`Q${qId}A3`] = {};
      state.children = [
        {
          code: "A1",
          qualifiedCode: `Q${qId}A1`,
        },
        {
          code: "A2",
          qualifiedCode: `Q${qId}A2`,
        },
        {
          code: "A3",
          qualifiedCode: `Q${qId}A3`,
        },
      ];

      break;

    case "mcq":
      returnObj[`Q${qId}A1`] = {};
      returnObj[`Q${qId}A2`] = {};
      returnObj[`Q${qId}A3`] = {};
      state.children = [
        {
          code: "A1",
          qualifiedCode: `Q${qId}A1`,
        },
        {
          code: "A2",
          qualifiedCode: `Q${qId}A2`,
        },
        {
          code: "A3",
          qualifiedCode: `Q${qId}A3`,
        },
      ];

      break;
    case "image_ranking":
      state.columns = 3;
      state.imageAspectRatio = 1;
      state.spacing = 8;
      returnObj[`Q${qId}A1`] = {};
      returnObj[`Q${qId}A2`] = {};
      returnObj[`Q${qId}A3`] = {};
      state.children = [
        {
          code: "A1",
          qualifiedCode: `Q${qId}A1`,
        },
        {
          code: "A2",
          qualifiedCode: `Q${qId}A2`,
        },
        {
          code: "A3",
          qualifiedCode: `Q${qId}A3`,
        },
      ];

      break;
    case "ranking":
      returnObj[`Q${qId}A1`] = {};
      returnObj[`Q${qId}A2`] = {};
      returnObj[`Q${qId}A3`] = {};
      state.children = [
        {
          code: "A1",
          qualifiedCode: `Q${qId}A1`,
        },
        {
          code: "A2",
          qualifiedCode: `Q${qId}A2`,
        },
        {
          code: "A3",
          qualifiedCode: `Q${qId}A3`,
        },
      ];

      break;
    case "nps":
      break;
    case "icon_mcq":
      state.columns = 3;
      state.iconSize = "150";
      state.spacing = 8;
      returnObj[`Q${qId}A1`] = {};
      returnObj[`Q${qId}A2`] = {};
      returnObj[`Q${qId}A3`] = {};
      state.children = [
        {
          code: "A1",
          qualifiedCode: `Q${qId}A1`,
        },
        {
          code: "A2",
          qualifiedCode: `Q${qId}A2`,
        },
        {
          code: "A3",
          qualifiedCode: `Q${qId}A3`,
        },
      ];

      break;
    case "image_mcq":
      state.columns = 3;
      state.imageAspectRatio = 1;
      state.spacing = 8;
      returnObj[`Q${qId}A1`] = {};
      returnObj[`Q${qId}A2`] = {};
      returnObj[`Q${qId}A3`] = {};
      state.children = [
        {
          code: "A1",
          qualifiedCode: `Q${qId}A1`,
        },
        {
          code: "A2",
          qualifiedCode: `Q${qId}A2`,
        },
        {
          code: "A3",
          qualifiedCode: `Q${qId}A3`,
        },
      ];

      break;
    case "scq_icon_array":
      returnObj[`Q${qId}Ac1`] = {
        type: "column",
      };
      returnObj[`Q${qId}Ac2`] = {
        type: "column",
      };
      returnObj[`Q${qId}Ac3`] = {
        type: "column",
      };
      returnObj[`Q${qId}A1`] = {
        type: "row",
      };
      returnObj[`Q${qId}A2`] = {
        type: "row",
      };
      returnObj[`Q${qId}A3`] = {
        type: "row",
      };
      state.children = [
        {
          code: "Ac1",
          qualifiedCode: `Q${qId}Ac1`,
          type: "column",
        },
        {
          code: "Ac2",
          qualifiedCode: `Q${qId}Ac2`,
          type: "column",
        },
        {
          code: "Ac3",
          qualifiedCode: `Q${qId}Ac3`,
          type: "column",
        },
        {
          code: "A1",
          qualifiedCode: `Q${qId}A1`,
          type: "row",
        },
        {
          code: "A2",
          qualifiedCode: `Q${qId}A2`,
          type: "row",
        },
        {
          code: "A3",
          qualifiedCode: `Q${qId}A3`,
          type: "row",
        },
      ];

      break;
    case "scq_array":
    case "mcq_array":
      returnObj[`Q${qId}Ac1`] = {
        type: "column",
      };
      returnObj[`Q${qId}Ac2`] = {
        type: "column",
      };
      returnObj[`Q${qId}Ac3`] = {
        type: "column",
      };
      returnObj[`Q${qId}A1`] = {
        type: "row",
      };
      returnObj[`Q${qId}A2`] = {
        type: "row",
      };
      returnObj[`Q${qId}A3`] = {
        type: "row",
      };
      state.children = [
        {
          code: "Ac1",
          qualifiedCode: `Q${qId}Ac1`,
          type: "column",
        },
        {
          code: "Ac2",
          qualifiedCode: `Q${qId}Ac2`,
          type: "column",
        },
        {
          code: "Ac3",
          qualifiedCode: `Q${qId}Ac3`,
          type: "column",
        },
        {
          code: "A1",
          qualifiedCode: `Q${qId}A1`,
          type: "row",
        },
        {
          code: "A2",
          qualifiedCode: `Q${qId}A2`,
          type: "row",
        },
        {
          code: "A3",
          qualifiedCode: `Q${qId}A3`,
          type: "row",
        },
      ];

      break;
    case "file_upload":
    case "signature":
    case "photo_capture":
    case "video_capture":
    case "barcode":
      break;
    case "date":
      state.type = "date";
      state.dateFormat = "YYYY/MM/DD";
      state.maxDate = "";
      state.minDate = "";

      break;
    case "date_time":
      state.dateFormat = "YYYY/MM/DD";
      state.fullDayFormat = false;
      state.maxDate = "";
      state.minDate = "";

      break;
    case "time":
      state.fullDayFormat = false;
      break;
    case "autocomplete":
    case "text_display":
    case "video_display":
    case "image_display":
      break;
    default:
      break;
  }
  return returnObj;
};

export const questionDesignError = (question) => {
  let errors = [];
  switch (question.type) {
    case "scq_icon_array":
    case "scq_array":
    case "mcq_array":
      if (
        !question.children ||
        question.children.filter((child) => child.type == "row").length === 0
      ) {
        errors.push({
          code: "insufficient_rows_min_1",
          message: "must have at least 1 row",
        });
      }
      if (
        !question.children ||
        question.children.filter((child) => child.type == "column").length < 2
      ) {
        errors.push({
          code: "insufficient_cols_min_2",
          message: "must have at least 2 columns",
        });
      }
      break;
    case "image_ranking":
    case "ranking":
    case "image_scq":
    case "scq":
    case "icon_scq":
      if (!question.children || question.children.length < 2) {
        errors.push({
          code: "insufficient_options_min_2",
          message: "must have at least 2 options",
        });
      }
      break;

    case "icon_mcq":
    case "image_mcq":
    case "multiple_text":
    case "mcq":
      if (!question.children || question.children.length < 1) {
        errors.push({
          code: "insufficient_options_min_1",
          message: "must have at least 1 option",
        });
      }
      break;
  }
  return errors;
};
