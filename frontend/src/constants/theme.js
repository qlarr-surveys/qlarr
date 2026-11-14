import { colorToThemeMode } from "~/components/Questions/utils";
export {
  BG_COLOR, TEXT_COLOR, PRIMARY_COLOR, SECONDARY_COLOR, ERR_COLOR,
  PAPER_COLOR, GROUP_FONT_SIZE, QUESTION_FONT_SIZE, TEXT_FONT_SIZE, FONT_FAMILY,
  BACKDROP_COLOR, defaultSurveyTheme,
} from "@qlarr/design-core/constants/surveyTheme";
import {
  BG_COLOR, TEXT_COLOR, PRIMARY_COLOR, SECONDARY_COLOR, ERR_COLOR,
  PAPER_COLOR, GROUP_FONT_SIZE, QUESTION_FONT_SIZE, TEXT_FONT_SIZE, FONT_FAMILY,
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
        // An image paints the survey canvas, so the colour steps aside rather
        // than covering it — and is only stepped over, never overwritten, so
        // dropping the image brings the same colour back.
        default: hasBackgroundImage
          ? "transparent"
          : surveyBgColor(theme?.bgColor),
        paper: theme?.paperColor || PAPER_COLOR,
      },
      text: {
        primary: theme?.textColor || TEXT_COLOR, // Main text color
      },
    },
  };
};
