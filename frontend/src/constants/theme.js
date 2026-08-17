import { colorToThemeMode } from "~/components/Questions/utils";
export {
  BG_COLOR, TEXT_COLOR, PRIMARY_COLOR, SECONDARY_COLOR, ERR_COLOR,
  PAPER_COLOR, GROUP_FONT_SIZE, QUESTION_FONT_SIZE, TEXT_FONT_SIZE, FONT_FAMILY,
  defaultSurveyTheme,
} from "./surveyTheme";
import {
  BG_COLOR, TEXT_COLOR, PRIMARY_COLOR, SECONDARY_COLOR, ERR_COLOR,
  PAPER_COLOR, GROUP_FONT_SIZE, QUESTION_FONT_SIZE, TEXT_FONT_SIZE, FONT_FAMILY,
} from "./surveyTheme";

export const defualtTheme = (theme) => {
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
        default: theme?.bgColor || BG_COLOR,
        paper: theme?.paperColor || PAPER_COLOR,
      },
      text: {
        primary: theme?.textColor || TEXT_COLOR, // Main text color
      },
    },
  };
};
