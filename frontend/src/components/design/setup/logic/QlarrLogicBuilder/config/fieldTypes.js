/**
 * Maps survey question types to logic builder field types
 * This replaces the massive switch statement in buildFields.jsx
 */
const QUESTION_TYPE_TO_FIELD_TYPE = {
  // Text-based questions
  text: 'text',
  autocomplete: 'text',
  email: 'text',
  barcode: 'text',
  paragraph: 'text',

  // Numeric questions
  number: 'number',

  // Single choice questions
  scq: 'select',
  icon_scq: 'select',
  image_scq: 'select',
  nps: 'select',

  // Multiple choice questions
  mcq: 'multiselect',
  icon_mcq: 'multiselect',
  image_mcq: 'multiselect',

  // Date/time questions
  date: 'date',
  time: 'time',
  date_time: 'datetime',

  // File-based questions
  file_upload: 'file',
  signature: 'file',
  photo_capture: 'file',
  video_capture: 'file',

  // Array questions (handled specially in field building)
  scq_array: 'select',
  mcq_array: 'multiselect',
  scq_icon_array: 'select',

  // Ranking questions
  ranking: 'number',
  image_ranking: 'number',

  // Multiple text
  multiple_text: 'text',
};

/**
 * Question types that support "other" text field
 */
const QUESTION_TYPES_WITH_OTHER = [
  'scq',
  'icon_scq',
  'image_scq',
  'mcq',
  'icon_mcq',
  'image_mcq',
];

/**
 * Question types that are arrays (rows/columns)
 */
const ARRAY_QUESTION_TYPES = [
  'scq_array',
  'mcq_array',
  'scq_icon_array',
];

/**
 * Question types that are ranking questions
 */
const RANKING_QUESTION_TYPES = [
  'ranking',
  'image_ranking',
];

/**
 * Get field type for a question type
 */
export function getFieldType(questionType) {
  return QUESTION_TYPE_TO_FIELD_TYPE[questionType] || 'text';
}

/**
 * Check if question type supports "other" text field
 */
export function hasOtherOption(questionType) {
  return QUESTION_TYPES_WITH_OTHER.includes(questionType);
}

/**
 * Check if question type is an array type
 */
export function isArrayType(questionType) {
  return ARRAY_QUESTION_TYPES.includes(questionType);
}

/**
 * Check if question type is a ranking type
 */
export function isRankingType(questionType) {
  return RANKING_QUESTION_TYPES.includes(questionType);
}

