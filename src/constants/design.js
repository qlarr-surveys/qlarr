export const CONVERTIBLE_CHOICE_TYPES = [
  "scq",
  "mcq",
  "icon_scq",
  "icon_mcq",
  "image_scq",
  "image_mcq",
];
export const CONVERTIBLE_TEXT_TYPES = ["text", "number", "email", "paragraph", "autocomplete"];
export const CONVERTIBLE_ARRAY_TYPES = ["scq_array", "mcq_array", "scq_icon_array"];
export const CONVERTIBLE_DATE_TIME_TYPES = ["date", "date_time", "time"];

export const isSingleSelect = (type) =>
  ["scq", "icon_scq", "image_scq"].includes(type);

export const mediaGroup = (type) => {
  if (["icon_scq", "icon_mcq"].includes(type)) return "icon";
  if (["image_scq", "image_mcq"].includes(type)) return "image";
  return "plain";
};
export const isArrayType = (type) => CONVERTIBLE_ARRAY_TYPES.includes(type);
export const isTextType = (type) => CONVERTIBLE_TEXT_TYPES.includes(type);
export const isDateTimeType = (type) => CONVERTIBLE_DATE_TIME_TYPES.includes(type);



export const ARRAY_MIN_WIDTH_KEYS = [
  "minHeaderMobile",
  "minHeaderDesktop",
  "minRowLabelMobile",
  "minRowLabelDesktop",
];

export const surveySetup = {
  code: "Survey",
  rules: [
    {
      title: "order_priority",
      key: "random",
      rules: ["randomize_groups", "prioritise_groups"],
    },
  ],
};

export const themeSetup = {
  code: "Survey",
  rules: [{ title: "", rules: ["theme"] }],
};
export const languageSetup = {
  code: "Survey",
  rules: [{ title: "", rules: ["language"] }],
};
export const logoSetup = {
  code: "Survey",
  rules: [{ title: "", key: "", rules: ["logo_setup"] }],
};

export const LOGO_ALIGNMENT_DEFAULT = "center";
export const LOGO_SIZE_DEFAULT = "medium";
export const LOGO_SPACING_DEFAULT = 48;

export const LOGO_SIZE_DIMENSIONS = {
  small: 120,
  medium: 240,
  large: 360,
};

export const setupOptions = (type) => {
  switch (type) {
    case "group":
    case "welcome":
    case "end": {
      const generalRules =
        type === "group"
          ? ["changeCode", "move_group", "disabled", "showDescription"]
          : ["changeCode", "disabled", "showDescription"];
      return [
        {
          title: "general",
          key: "general",
          rules: generalRules,
        },
        {
          title: "logic",
          key: "logic",
          rules: [
            "relevance",
            "randomize_questions",
            "prioritise_questions",
            "order_instructions",
          ],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];
    }
    case "text_display":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "order_instructions"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "image_display":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "order_instructions"],
        },
        {
          title: "design",
          key: "design",
          rules: ["imageWidth", "customCss"],
        },
      ];

    case "video_display":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "audio_only",
            "loop",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "order_instructions"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "text":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
            "maxChars",
            "hint",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_required",
            "validation_max_char_length",
            "validation_min_char_length",
            "validation_pattern",
            "validation_contains",
            "validation_not_contains",
            "custom_validation_rules",
          ],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "options":
      return [
        {
          title: "",
          key: "",
          rules: ["changeCode", "disabled", "relevance"],
        },
      ];

    case "other_text":
      return [
        {
          title: "general",
          key: "general",
          rules: ["maxChars"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_required",
            "validation_max_char_length",
            "validation_min_char_length",
            "validation_pattern",
            "validation_contains",
            "validation_not_contains",
            "custom_validation_rules",
          ],
        },
      ];

    case "text_item":
      return [
        {
          title: "general",
          key: "general",
          rules: ["changeCode", "disabled", "maxChars"],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_max_char_length",
            "validation_min_char_length",
            "validation_pattern",
            "validation_contains",
            "validation_not_contains",
            "custom_validation_rules",
          ],
        },
      ];

    case "number":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
            "maxChars",
            "decimal_separator",
            "hint",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_required",
            "validation_between",
            "validation_not_between",
            "validation_lt",
            "validation_lte",
            "validation_gt",
            "validation_gte",
            "validation_equals",
            "validation_not_equal",
            "custom_validation_rules",
          ],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "email":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
            "maxChars",
            "hint",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_required",
            "validation_pattern_email",
            "validation_max_char_length",
            "validation_min_char_length",
            "custom_validation_rules",
          ],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "autocomplete":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "paragraph":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
            "minRows",
            "showWordCount",
            "hint",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_required",
            "validation_max_word_count",
            "validation_min_word_count",
            "validation_contains",
            "validation_not_contains",
            "custom_validation_rules",
          ],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "file_upload":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_required",
            "validation_file_types",
            "validation_max_file_size",
            "custom_validation_rules",
          ],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "signature":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "photo_capture":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "validation_max_file_size", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "barcode":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "video_capture":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "validation_max_file_size", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "date_time":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
            "dateFormat",
            "fullDayFormat",
            "maxDate",
            "minDate",
            "hint",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "date":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
            "dateFormat",
            "maxDate",
            "minDate",
            "hint",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "time":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
            "fullDayFormat",
            "hint",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];
    case "scq":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
            "scq_default_value",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "randomize_options", "prioritise_options", "skip_logic", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "icon_scq":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "randomize_options", "prioritise_options", "skip_logic", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["hideText", "columns", "iconSize", "spacing", "customCss"],
        },
      ];

    case "image_scq":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "randomize_options", "prioritise_options", "skip_logic", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["hideText", "columns", "imageAspectRatio", "spacing", "customCss"],
        },
      ];

    case "mcq":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "randomize_options", "prioritise_options", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_min_option_count",
            "validation_max_option_count",
            "validation_option_count",
            "custom_validation_rules",
          ],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "multiple_text":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "randomize_options", "prioritise_options", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "ranking":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "randomize_options", "prioritise_options", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_min_ranking_count",
            "validation_max_ranking_count",
            "validation_ranking_count",
            "custom_validation_rules",
          ],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];

    case "image_ranking":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "randomize_options", "prioritise_options", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_min_ranking_count",
            "validation_max_ranking_count",
            "validation_ranking_count",
            "custom_validation_rules",
          ],
        },
        {
          title: "design",
          key: "design",
          rules: ["hideText", "columns", "imageAspectRatio", "spacing", "customCss"],
        },
      ];

    case "icon_mcq":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "randomize_options", "prioritise_options", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_min_option_count",
            "validation_max_option_count",
            "validation_option_count",
            "custom_validation_rules",
          ],
        },
        {
          title: "design",
          key: "design",
          rules: ["hideText", "columns", "iconSize", "spacing", "customCss"],
        },
      ];

    case "image_mcq":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "randomize_options", "prioritise_options", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: [
            "validation_min_option_count",
            "validation_max_option_count",
            "validation_option_count",
            "custom_validation_rules",
          ],
        },
        {
          title: "design",
          key: "design",
          rules: ["hideText", "columns", "imageAspectRatio", "spacing", "customCss"],
        },
      ];
    case "scq_icon_array":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "convert_question_type",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "randomize_rows", "prioritise_rows", "randomize_columns", "prioritise_columns", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "validation_one_response_per_col", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["hideText", "columns", "iconSize", "spacing", "customCss"],
        },
      ];
    case "mcq_array":
    case "scq_array":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "showDescription",
            "convert_question_type",
            "disabled",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "randomize_rows", "prioritise_rows", "randomize_columns", "prioritise_columns", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "validation_one_response_per_col", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["minHeaderMobile", "minHeaderDesktop", "minRowLabelMobile", "minRowLabelDesktop", "customCss"],
        },
      ];
    case "nps":
      return [
        {
          title: "general",
          key: "general",
          rules: [
            "changeCode",
            "disabled",
            "showDescription",
            "lower_bound_hint",
            "higher_bound_hint",
          ],
        },
        {
          title: "logic",
          key: "logic",
          rules: ["relevance", "prefill", "order_instructions"],
        },
        {
          title: "validation",
          key: "validation",
          rules: ["validation_required", "custom_validation_rules"],
        },
        {
          title: "design",
          key: "design",
          rules: ["customCss"],
        },
      ];
  }
};
