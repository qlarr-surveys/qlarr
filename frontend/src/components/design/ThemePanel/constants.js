import {
  BACKDROP_COLOR,
  BG_COLOR,
  PAPER_COLOR,
  PRIMARY_COLOR,
  TEXT_COLOR,
} from "@qlarr/design-core/constants/surveyTheme";

// The fonts and sizes live in design-core, beside the theme defaults.
export {
  ANSWER_SIZES,
  FONTS,
  MORE_ANSWER_SIZES,
  MORE_FONTS,
  MORE_QUESTION_SIZES,
  MORE_TITLE_SIZES,
  QUESTION_SIZES,
  TITLE_SIZES,
} from "@qlarr/design-core/constants/surveyTheme";

/**
 * The presets behind the theme panel's chips and swatches.
 *
 * Each list leads with the survey default, so an untouched survey shows a
 * selected preset rather than falling through to "Custom". The remaining
 * values come from the phase-3.3 design; anything outside a list is still
 * reachable — colors through the custom picker, sizes through "More sizes".
 */

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

// The backdrop exists to make text readable over a photograph, so these are
// washes rather than colours: every one is mostly see-through, and the list
// leads with the default the way the others do. Anything else — including a
// heavier wash of the same shade — is a drag of the picker's opacity bar away.
export const BACKDROP_COLORS = [
  { value: BACKDROP_COLOR, labelKey: "theme_color_black" },
  { value: "rgba(0, 0, 0, 0.45)", labelKey: "theme_color_deep_black" },
  { value: "rgba(9, 17, 51, 0.35)", labelKey: "theme_color_navy" },
  { value: "rgba(255, 255, 255, 0.3)", labelKey: "theme_color_white" },
];
