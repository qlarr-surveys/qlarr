import {
  BG_COLOR,
  FONT_FAMILY,
  GROUP_FONT_SIZE,
  PAPER_COLOR,
  PRIMARY_COLOR,
  QUESTION_FONT_SIZE,
  TEXT_COLOR,
  TEXT_FONT_SIZE,
} from "@qlarr/design-core/constants/surveyTheme";

/**
 * The presets behind the theme panel's chips and swatches.
 *
 * Each list leads with the survey default, so an untouched survey shows a
 * selected preset rather than falling through to "Custom". The remaining
 * values come from the phase-3.3 design; anything outside a list is still
 * reachable — colors through the custom picker, sizes through "More sizes".
 */

export const FONTS = [FONT_FAMILY, "Roboto", "Open Sans"];

export const MORE_FONTS = [
  "Lato",
  "Poppins",
  "Raleway",
  "Merriweather",
  "Georgia",
  "Times New Roman",
  "Arial",
  "Courier New",
];

export const TITLE_SIZES = [24, 28, GROUP_FONT_SIZE, 38];
export const MORE_TITLE_SIZES = [20, 22, 26, 30, 34, 36, 40, 44, 48];

export const QUESTION_SIZES = [15, QUESTION_FONT_SIZE, 20, 22];
export const MORE_QUESTION_SIZES = [14, 16, 17, 19, 21, 24, 26, 28];

export const ANSWER_SIZES = [13, TEXT_FONT_SIZE, 16];
export const MORE_ANSWER_SIZES = [12, 15, 17, 18, 20];

export const ACCENT_COLORS = [
  { value: PRIMARY_COLOR, labelKey: "theme_color_indigo" },
  { value: "#1b6b52", labelKey: "theme_color_green" },
  { value: "#8a3ad8", labelKey: "theme_color_violet" },
  { value: "#b4531a", labelKey: "theme_color_amber" },
];

export const SURVEY_BACKGROUNDS = [
  { value: BG_COLOR, labelKey: "theme_color_cool_grey" },
  { value: "#ffffff", labelKey: "theme_color_white" },
  { value: "#f4f1ea", labelKey: "theme_color_warm_sand" },
  { value: "#eef4f2", labelKey: "theme_color_mint" },
];

export const AREA_BACKGROUNDS = [
  { value: PAPER_COLOR, labelKey: "theme_color_white" },
  { value: "#fbfcfe", labelKey: "theme_color_off_white" },
  { value: "#f6f7fc", labelKey: "theme_color_tinted" },
];

export const TEXT_COLORS = [
  { value: TEXT_COLOR, labelKey: "theme_color_navy" },
  { value: "#1a1a1a", labelKey: "theme_color_near_black" },
  { value: "#33384f", labelKey: "theme_color_slate" },
];

// A background image hides the survey background colour rather than replacing
// it, so picking one parks the colour at fully transparent — and dropping the
// image has to put a real colour back.
export const TRANSPARENT = "rgba(0, 0, 0, 0)";
