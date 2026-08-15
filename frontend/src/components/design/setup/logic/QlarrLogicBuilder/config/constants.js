/**
 * Field type constants - replaces magic strings throughout the codebase
 */
export const FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  MULTISELECT: 'multiselect',
  DATE: 'date',
  TIME: 'time',
  DATETIME: 'datetime',
  FILE: 'file',
  GROUP: 'group',
  SURVEY_MODE: 'survey_mode',
  SURVEY_LANG: 'survey_lang',
};

/**
 * Array of select-like field types for easy checking
 */
export const SELECT_FIELD_TYPES = [
  FIELD_TYPES.SELECT,
  FIELD_TYPES.MULTISELECT,
  FIELD_TYPES.SURVEY_LANG,
];

/**
 * Date/time format constants - centralizes scattered format strings
 */
export const DATE_FORMATS = {
  // Display formats (shown to user in UI)
  DATE_DISPLAY: 'DD.MM.YYYY',
  TIME_DISPLAY: 'HH:mm',
  DATETIME_DISPLAY: 'DD.MM.YYYY HH:mm',

  // Value formats (stored/transmitted to backend)
  DATE_VALUE: 'YYYY-MM-DD',
  TIME_VALUE: 'HH:mm:ss',
  DATETIME_VALUE: 'YYYY-MM-DD HH:mm:ss',
};

/**
 * Popper props shared by all logic-builder date/time pickers.
 * `bottom-start` anchors the popup to the field's start edge so it opens toward
 * the canvas and never overflows left into the narrow design sidebar.
 */
export const PICKER_POPPER_PROPS = { placement: 'bottom-start' };
