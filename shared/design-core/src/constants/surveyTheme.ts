// @ts-nocheck — loose JS-origin logic; internals stay untyped, public API typed at index.ts
export const BG_COLOR = "#dfe2ef";
export const TEXT_COLOR = "#091133";
export const PRIMARY_COLOR = "#2d3cb1";
export const SECONDARY_COLOR = "#672ebf";
export const ERR_COLOR = "#d13e17";
export const PAPER_COLOR = "#ffffff";
export const GROUP_FONT_SIZE = 32;
export const QUESTION_FONT_SIZE = 18;
export const TEXT_FONT_SIZE = 14;
export const FONT_FAMILY = "Rubik";

/**
 * What Backdrop Color starts at once it is switched on: black, barely there.
 */
export const BACKDROP_COLOR = "rgba(0, 0, 0, 0.2)";

/**
 * How `backdropColor` says there is no backdrop.
 *
 * It has to be said, not left out: a theme with no `backdropColor` at all is a
 * survey saved before the setting existed, which is rendered the way it always
 * was. That is also why the key stays out of `defaultSurveyTheme` — stamping
 * it onto every survey would erase the one thing that tells the two apart.
 */
export const NO_BACKDROP = "none";

export const defaultSurveyTheme = {
  textStyles: {
    group: {
      font: FONT_FAMILY,
      size: GROUP_FONT_SIZE,
      color: TEXT_COLOR,
    },
    question: {
      font: FONT_FAMILY,
      size: QUESTION_FONT_SIZE,
      color: TEXT_COLOR,
    },
    text: {
      font: FONT_FAMILY,
      size: TEXT_FONT_SIZE,
      color: TEXT_COLOR,
    },
  },
  primaryColor: PRIMARY_COLOR,
  bgColor: BG_COLOR,
  paperColor: PAPER_COLOR,
};
