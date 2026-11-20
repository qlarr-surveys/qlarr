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

/*
 * How a survey's background is stored.
 *
 * Every renderer — the current one, and the older ones still running inside
 * installed Android apps — paints `bgColor` over the canvas, image or not. That
 * is the contract, and the backdrop is built on it rather than around it:
 *
 *   no image   bgColor       the background colour
 *   an image   bgColor       the backdrop wash, or TRANSPARENT for none
 *              backdropColor the backdrop setting, kept while the image is
 *                            gone so that a new image gets it back
 *              bgColorWithoutImage
 *                            the background colour, set aside until the
 *                            image goes
 *
 * So a survey designed today renders the same on a renderer that has never
 * heard of a backdrop, and a survey from before the setting — whose colour
 * over an image was the only way there was to tint one — renders exactly as
 * it always has. Neither `backdropColor` nor `bgColorWithoutImage` goes in
 * `defaultSurveyTheme`: a survey only takes them on once it is given an image,
 * so one that never is keeps exactly the shape it always had.
 */

/** What Backdrop Color starts at once it is switched on: black, barely there. */
export const BACKDROP_COLOR = "rgba(0, 0, 0, 0.2)";

/** How `backdropColor` says there is no backdrop. */
export const NO_BACKDROP = "none";

/**
 * What `bgColor` holds under an image with no backdrop: the colour every
 * renderer paints as nothing, and the one the old panel wrote there too.
 */
export const TRANSPARENT = "rgba(0, 0, 0, 0)";

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

/*
 * The fonts and sizes the theme panel offers. Each list leads with the survey
 * default, and the `MORE_` lists are behind the panel's "More fonts" /
 * "More sizes".
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
