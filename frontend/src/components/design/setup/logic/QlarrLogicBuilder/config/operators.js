/**
 * Operator registry - replaces the 700-line config.jsx
 * Each operator defines:
 * - key: unique identifier
 * - labelKey: i18n translation key
 * - descriptionKey: i18n key for description (shown in dropdown)
 * - displayLabel: fallback label if translation not available
 * - category: grouping for UI (comparison, text, selection, state, system)
 * - cardinality: 0 = no value, 1 = single value, 2 = range (min/max)
 * - jsonLogicOp: the operator name used in JSON Logic output
 * - applicableTypes: which field types this operator can be used with
 */
export const OPERATORS = {
  // Comparison operators
  equal: {
    key: 'equal',
    labelKey: 'logic_builder.equals',
    descriptionKey: 'logic_builder.equals_desc',
    displayLabel: 'is',
    category: 'comparison',
    cardinality: 1,
    jsonLogicOp: '==',
    applicableTypes: ['text', 'number', 'date', 'time', 'datetime'],
  },
  not_equal: {
    key: 'not_equal',
    labelKey: 'logic_builder.not_equals',
    descriptionKey: 'logic_builder.not_equals_desc',
    displayLabel: "isn't",
    category: 'comparison',
    cardinality: 1,
    jsonLogicOp: '!=',
    applicableTypes: ['text', 'number', 'date', 'time', 'datetime'],
  },
  less: {
    key: 'less',
    labelKey: 'logic_builder.less_than',
    descriptionKey: 'logic_builder.less_than_desc',
    displayLabel: 'less than',
    category: 'comparison',
    cardinality: 1,
    jsonLogicOp: '<',
    applicableTypes: ['number', 'date', 'time', 'datetime'],
  },
  less_or_equal: {
    key: 'less_or_equal',
    labelKey: 'logic_builder.less_or_equal',
    descriptionKey: 'logic_builder.less_or_equal_desc',
    displayLabel: 'at most',
    category: 'comparison',
    cardinality: 1,
    jsonLogicOp: '<=',
    applicableTypes: ['number', 'date', 'time', 'datetime'],
  },
  greater: {
    key: 'greater',
    labelKey: 'logic_builder.greater_than',
    descriptionKey: 'logic_builder.greater_than_desc',
    displayLabel: 'more than',
    category: 'comparison',
    cardinality: 1,
    jsonLogicOp: '>',
    applicableTypes: ['number', 'date', 'time', 'datetime'],
  },
  greater_or_equal: {
    key: 'greater_or_equal',
    labelKey: 'logic_builder.greater_or_equal',
    descriptionKey: 'logic_builder.greater_or_equal_desc',
    displayLabel: 'at least',
    category: 'comparison',
    cardinality: 1,
    jsonLogicOp: '>=',
    applicableTypes: ['number', 'date', 'time', 'datetime'],
  },
  between: {
    key: 'between',
    labelKey: 'logic_builder.between',
    descriptionKey: 'logic_builder.between_desc',
    displayLabel: 'between',
    category: 'comparison',
    cardinality: 2,
    jsonLogicOp: 'between',
    applicableTypes: ['number', 'date', 'time', 'datetime'],
  },
  not_between: {
    key: 'not_between',
    labelKey: 'logic_builder.not_between',
    descriptionKey: 'logic_builder.not_between_desc',
    displayLabel: 'not between',
    category: 'comparison',
    cardinality: 2,
    jsonLogicOp: 'not_between',
    applicableTypes: ['number', 'date', 'time', 'datetime'],
  },

  // String operators
  like: {
    key: 'like',
    labelKey: 'logic_builder.contains',
    descriptionKey: 'logic_builder.contains_desc',
    displayLabel: 'contains',
    category: 'text',
    cardinality: 1,
    jsonLogicOp: 'contains',
    applicableTypes: ['text'],
  },
  not_like: {
    key: 'not_like',
    labelKey: 'logic_builder.not_contains',
    descriptionKey: 'logic_builder.not_contains_desc',
    displayLabel: "doesn't contain",
    category: 'text',
    cardinality: 1,
    jsonLogicOp: 'not_contains',
    applicableTypes: ['text'],
  },
  starts_with: {
    key: 'starts_with',
    labelKey: 'logic_builder.starts_with',
    descriptionKey: 'logic_builder.starts_with_desc',
    displayLabel: 'starts with',
    category: 'text',
    cardinality: 1,
    jsonLogicOp: 'startsWith',
    applicableTypes: ['text'],
  },
  ends_with: {
    key: 'ends_with',
    labelKey: 'logic_builder.ends_with',
    descriptionKey: 'logic_builder.ends_with_desc',
    displayLabel: 'ends with',
    category: 'text',
    cardinality: 1,
    jsonLogicOp: 'endsWith',
    applicableTypes: ['text'],
  },

  // Selection operators (single choice)
  select_any_in: {
    key: 'select_any_in',
    labelKey: 'logic_builder.has_any_selected',
    descriptionKey: 'logic_builder.has_any_selected_desc',
    displayLabel: 'includes',
    category: 'selection',
    cardinality: 1,
    jsonLogicOp: 'in',
    applicableTypes: ['select', 'survey_lang'],
  },
  select_not_any_in: {
    key: 'select_not_any_in',
    labelKey: 'logic_builder.has_none_selected',
    descriptionKey: 'logic_builder.has_none_selected_desc',
    displayLabel: "doesn't include",
    category: 'selection',
    cardinality: 1,
    jsonLogicOp: 'not_in',
    applicableTypes: ['select', 'survey_lang'],
  },

  // Selection operators (multiple choice)
  multiselect_equals: {
    key: 'multiselect_equals',
    labelKey: 'logic_builder.has_any_selected',
    descriptionKey: 'logic_builder.has_any_selected_desc',
    displayLabel: 'includes',
    category: 'selection',
    cardinality: 1,
    jsonLogicOp: 'in',
    applicableTypes: ['multiselect'],
  },
  multiselect_not_equals: {
    key: 'multiselect_not_equals',
    labelKey: 'logic_builder.has_none_selected',
    descriptionKey: 'logic_builder.has_none_selected_desc',
    displayLabel: "doesn't include",
    category: 'selection',
    cardinality: 1,
    jsonLogicOp: 'not_in',
    applicableTypes: ['multiselect'],
  },

  // State operators (no value needed)
  is_relevant: {
    key: 'is_relevant',
    labelKey: 'logic_builder.is_displayed',
    descriptionKey: 'logic_builder.is_displayed_desc',
    displayLabel: 'is shown',
    category: 'state',
    cardinality: 0,
    jsonLogicOp: 'is_relevant',
    applicableTypes: ['text', 'number', 'select', 'multiselect', 'date', 'time', 'datetime', 'file', 'group', 'question_state'],
  },
  is_not_relevant: {
    key: 'is_not_relevant',
    labelKey: 'logic_builder.is_hidden',
    descriptionKey: 'logic_builder.is_hidden_desc',
    displayLabel: 'is hidden',
    category: 'state',
    cardinality: 0,
    jsonLogicOp: 'is_not_relevant',
    applicableTypes: ['text', 'number', 'select', 'multiselect', 'date', 'time', 'datetime', 'file', 'group', 'question_state'],
  },
  is_valid: {
    key: 'is_valid',
    labelKey: 'logic_builder.is_valid',
    descriptionKey: 'logic_builder.is_valid_desc',
    displayLabel: 'is valid',
    category: 'state',
    cardinality: 0,
    jsonLogicOp: 'is_valid',
    applicableTypes: ['text', 'number', 'select', 'multiselect', 'date', 'time', 'datetime', 'file', 'group', 'question_state'],
  },
  is_not_valid: {
    key: 'is_not_valid',
    labelKey: 'logic_builder.is_not_valid',
    descriptionKey: 'logic_builder.is_not_valid_desc',
    displayLabel: 'is invalid',
    category: 'state',
    cardinality: 0,
    jsonLogicOp: 'is_not_valid',
    applicableTypes: ['text', 'number', 'select', 'multiselect', 'date', 'time', 'datetime', 'file', 'group', 'question_state'],
  },
  is_empty: {
    key: 'is_empty',
    labelKey: 'logic_builder.is_empty',
    descriptionKey: 'logic_builder.is_empty_desc',
    displayLabel: 'is empty',
    category: 'state',
    cardinality: 0,
    jsonLogicOp: 'is_empty',
    applicableTypes: ['text', 'number', 'select', 'multiselect', 'date', 'time', 'datetime', 'file'],
  },
  is_not_empty: {
    key: 'is_not_empty',
    labelKey: 'logic_builder.is_not_empty',
    descriptionKey: 'logic_builder.is_not_empty_desc',
    displayLabel: 'is answered',
    category: 'state',
    cardinality: 0,
    jsonLogicOp: 'is_not_empty',
    applicableTypes: ['text', 'number', 'select', 'multiselect', 'date', 'time', 'datetime', 'file'],
  },

  // Survey mode operators
  is_online: {
    key: 'is_online',
    labelKey: 'logic_builder.is_online',
    descriptionKey: 'logic_builder.is_online_desc',
    displayLabel: 'is online',
    category: 'system',
    cardinality: 0,
    jsonLogicOp: 'is_online',
    applicableTypes: ['survey_mode'],
  },
  is_offline: {
    key: 'is_offline',
    labelKey: 'logic_builder.is_offline',
    descriptionKey: 'logic_builder.is_offline_desc',
    displayLabel: 'is offline',
    category: 'system',
    cardinality: 0,
    jsonLogicOp: 'is_offline',
    applicableTypes: ['survey_mode'],
  },
};

/**
 * Get all operators applicable for a given field type
 */
export function getOperatorsForFieldType(fieldType) {
  return Object.values(OPERATORS).filter((op) =>
    op.applicableTypes.includes(fieldType)
  );
}

/**
 * Get operator definition by key
 */
export function getOperator(key) {
  return OPERATORS[key];
}

/**
 * Get default operator for a field type
 */
export function getDefaultOperator(fieldType) {
  const operators = getOperatorsForFieldType(fieldType);
  if (operators.length === 0) return 'equal';

  // Return a sensible default based on type
  const defaults = {
    text: 'equal',
    number: 'equal',
    select: 'select_any_in',
    multiselect: 'multiselect_equals',
    date: 'greater_or_equal',
    time: 'greater_or_equal',
    datetime: 'greater_or_equal',
    file: 'is_not_empty',
    group: 'is_relevant',
    survey_mode: 'is_online',
    survey_lang: 'select_any_in',
  };

  return defaults[fieldType] || operators[0].key;
}

/**
 * Find operator key by its JSON Logic operator name
 */
export function findOperatorByJsonLogicOp(jsonLogicOp) {
  return Object.values(OPERATORS).find((op) => op.jsonLogicOp === jsonLogicOp);
}

/**
 * Get operator keys (not full definitions) for a given field type
 * This replaces the removed FIELD_TYPE_OPERATORS from fieldTypes.js
 */
export function getOperatorKeysForFieldType(fieldType) {
  return Object.entries(OPERATORS)
    .filter(([, op]) => op.applicableTypes.includes(fieldType))
    .map(([key]) => key);
}
