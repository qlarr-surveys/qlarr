// @ts-nocheck — loose JS-origin logic; internals stay untyped, public API typed at index.ts
const QUESTION_TYPE_TO_FIELD_TYPE = {
  // Text-based questions
  text: 'text',
  autocomplete: 'text',
  hierarchical_autocomplete: 'text',
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


const QUESTION_TYPES_WITH_OTHER = [
  'scq',
  'icon_scq',
  'image_scq',
  'mcq',
  'icon_mcq',
  'image_mcq',
];


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


export function hasOtherOption(questionType) {
  return QUESTION_TYPES_WITH_OTHER.includes(questionType);
}


export { isArrayType } from "../constants/design";

export function isRankingType(questionType) {
  return RANKING_QUESTION_TYPES.includes(questionType);
}

