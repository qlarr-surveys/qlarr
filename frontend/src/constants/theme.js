import { colorToThemeMode } from "~/components/Questions/utils";
export {
  BG_COLOR, TEXT_COLOR, PRIMARY_COLOR, SECONDARY_COLOR, ERR_COLOR,
  PAPER_COLOR, GROUP_FONT_SIZE, QUESTION_FONT_SIZE, TEXT_FONT_SIZE, FONT_FAMILY,
  BACKDROP_COLOR, NO_BACKDROP, defaultSurveyTheme,
} from "@qlarr/design-core/constants/surveyTheme";
import {
  BG_COLOR, TEXT_COLOR, PRIMARY_COLOR, SECONDARY_COLOR, ERR_COLOR,
  PAPER_COLOR, GROUP_FONT_SIZE, QUESTION_FONT_SIZE, TEXT_FONT_SIZE, FONT_FAMILY,
  NO_BACKDROP,
} from "@qlarr/design-core/constants/surveyTheme";

/**
 * The notation a survey used to be left in while a background image covered it.
 *
 * Nothing could ask whether an image was set at the time, so the colour itself
 * was parked at fully transparent to get it out of the way. The renderer asks
 * that question directly now, which leaves the old value meaning only "there
 * was an image here once" — so it reads back as a real colour rather than as a
 * survey with no background at all.
 */
const TRANSPARENT_BG = "rgba(0, 0, 0, 0)";

export const surveyBgColor = (bgColor) =>
  !bgColor || bgColor === TRANSPARENT_BG ? BG_COLOR : bgColor;

/**
 * True for a survey saved before the backdrop setting existed.
 *
 * Its renderer had one colour for the canvas and painted it over the image
 * regardless, so a translucent background colour was the only way to tint an
 * image — and surveys did. Those keep rendering exactly that way, down to the
 * question parts that borrow the canvas colour, until the backdrop is set.
 */
export const isLegacyBackdrop = (theme) => theme?.backdropColor == null;

/**
 * The wash over a survey's background image, or null for none: what the
 * survey actually shows, whichever of the two models it was saved under. For a
 * survey from before the setting, that is its background colour as the old
 * renderer read it — less the fully transparent one the old panel parked there
 * to mean "nothing".
 */
export const surveyBackdrop = (theme, hasBackgroundImage) => {
  if (!hasBackgroundImage) {
    return null;
  }
  if (!isLegacyBackdrop(theme)) {
    return theme.backdropColor === NO_BACKDROP ? null : theme.backdropColor;
  }
  const legacy = theme?.bgColor || BG_COLOR;
  return legacy === TRANSPARENT_BG ? null : legacy;
};

/**
 * The colour of the survey canvas, which the question parts that blend into it
 * read as well. A survey on the backdrop setting keeps it clear under an image
 * and lays the backdrop onto the image instead; one from before the setting
 * keeps painting its colour there, the way it always has.
 */
const canvasColor = (theme, hasBackgroundImage) => {
  if (!hasBackgroundImage) {
    return surveyBgColor(theme?.bgColor);
  }
  return (
    (isLegacyBackdrop(theme) && surveyBackdrop(theme, true)) || "transparent"
  );
};

export const defualtTheme = (theme, hasBackgroundImage = false) => {
  return {
    textStyles: {
      group: {
        font: theme?.textStyles?.group?.font || FONT_FAMILY,
        size: theme?.textStyles?.group?.size || GROUP_FONT_SIZE,
        color: theme?.textStyles?.group?.color || TEXT_COLOR,
      },
      question: {
        font: theme?.textStyles?.question?.font || FONT_FAMILY,
        size: theme?.textStyles?.question?.size || QUESTION_FONT_SIZE,
        color: theme?.textStyles?.question?.color || TEXT_COLOR,
      },
      text: {
        font: theme?.textStyles?.text?.font || FONT_FAMILY,
        size: theme?.textStyles?.text?.size || TEXT_FONT_SIZE,
        color: theme?.textStyles?.text?.color || TEXT_COLOR,
      },
    },
    typography: {
      fontFamily: theme?.textStyles?.text?.font || FONT_FAMILY,
      fontSize: theme?.textStyles?.text?.size || TEXT_FONT_SIZE,
      // This will apply to most MUI components including TextField
    },
    palette: {
      mode: colorToThemeMode(theme?.textColor || TEXT_COLOR),
      primary: {
        main: theme?.primaryColor || PRIMARY_COLOR,
      },
      secondary: {
        main: SECONDARY_COLOR,
      },
      error: {
        main: ERR_COLOR,
      },
      background: {
        default: canvasColor(theme, hasBackgroundImage),
        paper: theme?.paperColor || PAPER_COLOR,
      },
      text: {
        primary: theme?.textColor || TEXT_COLOR, // Main text color
      },
    },
  };
};
