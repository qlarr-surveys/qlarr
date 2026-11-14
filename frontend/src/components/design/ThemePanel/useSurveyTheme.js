import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { defaultSurveyTheme } from "@qlarr/design-core/constants/surveyTheme";
import { changeAttribute, changeResources } from "~/state/design/designState";
import {
  NO_BACKDROP,
  isLegacyBackdrop,
  surveyBackdrop,
  surveyBgColor,
} from "~/constants/theme";

const TEXT_STYLES = ["group", "question", "text"];

/**
 * Reads the survey theme as the flat set of values the panel edits, and writes
 * changes back in the shape the DSL stores them.
 *
 * The two shapes differ on purpose: the DSL keeps a font and a colour per text
 * style, while the panel offers one survey font and one survey text colour —
 * so a write fans out across all three styles, the way the theme is actually
 * authored. Sizes stay per style, because that is what "page title" and
 * "question text" mean.
 */
export default function useSurveyTheme() {
  const dispatch = useDispatch();

  const theme = useSelector((state) => state.designState.Survey?.theme);
  const backgroundImage = useSelector(
    (state) => state.designState.Survey?.resources?.backgroundImage
  );

  // A survey saved before a given theme key existed simply has no value for
  // it, so every read falls back to the default theme rather than to undefined.
  const base = useMemo(() => {
    const textStyles = {};
    TEXT_STYLES.forEach((key) => {
      textStyles[key] = {
        ...defaultSurveyTheme.textStyles[key],
        ...(theme?.textStyles?.[key] || {}),
      };
    });
    return { ...defaultSurveyTheme, ...(theme || {}), textStyles };
  }, [theme]);

  const values = useMemo(
    () => ({
      font: base.textStyles.group.font,
      titleSize: base.textStyles.group.size,
      questionSize: base.textStyles.question.size,
      answerSize: base.textStyles.text.size,
      accent: base.primaryColor,
      // Older surveys parked this at fully transparent while an image covered
      // them; the panel shows the colour such a survey will fall back to, not
      // a swatch with nothing in it.
      surveyBg: surveyBgColor(base.bgColor),
      areaBg: base.paperColor,
      textColor: base.textStyles.group.color,
      backgroundImage: backgroundImage || null,
      // What the survey visibly has over its image — for one saved before the
      // setting, that is its background colour. Read from the stored theme
      // rather than `base`, whose defaults would invent a colour the renderer
      // never paints.
      backdropColor: surveyBackdrop(theme, Boolean(backgroundImage)),
    }),
    [base, backgroundImage, theme]
  );

  const write = useCallback(
    (value) => {
      dispatch(changeAttribute({ code: "Survey", key: "theme", value }));
    },
    [dispatch]
  );

  const mapTextStyles = useCallback(
    (change) => {
      const textStyles = {};
      TEXT_STYLES.forEach((key) => {
        textStyles[key] = { ...base.textStyles[key], ...change };
      });
      return textStyles;
    },
    [base]
  );

  const setFont = useCallback(
    (font) => write({ ...base, textStyles: mapTextStyles({ font }) }),
    [base, mapTextStyles, write]
  );

  const setSize = useCallback(
    (style, size) =>
      write({
        ...base,
        textStyles: {
          ...base.textStyles,
          [style]: { ...base.textStyles[style], size },
        },
      }),
    [base, write]
  );

  // `textColor` is what the MUI theme reads for the palette; the per-style
  // colours are what the renderer reads. Both have to move together.
  const setTextColor = useCallback(
    (color) =>
      write({ ...base, textColor: color, textStyles: mapTextStyles({ color }) }),
    [base, mapTextStyles, write]
  );

  const setColor = useCallback(
    (key, value) => write({ ...base, [key]: value }),
    [base, write]
  );

  // The background colour is left exactly as it was. Which of the two gets
  // painted is the renderer's decision, so an image no longer has to overwrite
  // a colour to hide it — and dropping the image brings back the colour that
  // was chosen, rather than whichever one the theme happens to default to.
  //
  // That holds for a survey on the backdrop setting. One from before it paints
  // its colour over any image it is given, so a first image would land under
  // the default grey and never be seen: giving one moves the survey onto the
  // setting, with no backdrop — the same clean image the old panel produced.
  // Replacing an image leaves the survey on whichever footing it was already.
  const setBackgroundImage = useCallback(
    (name) => {
      dispatch(
        changeResources({ code: "Survey", key: "backgroundImage", value: name })
      );
      if (name && !backgroundImage && isLegacyBackdrop(theme)) {
        write({ ...base, backdropColor: NO_BACKDROP });
      }
    },
    [backgroundImage, base, dispatch, theme, write]
  );

  // No backdrop is written out as "none" rather than left out: a theme with no
  // `backdropColor` is a survey from before the setting, rendered the old way,
  // and setting the backdrop either way is what moves a survey off that.
  const setBackdropColor = useCallback(
    (color) => write({ ...base, backdropColor: color || NO_BACKDROP }),
    [base, write]
  );

  const reset = useCallback(() => {
    write(defaultSurveyTheme);
    dispatch(
      changeResources({ code: "Survey", key: "backgroundImage", value: null })
    );
  }, [dispatch, write]);

  return {
    values,
    setFont,
    setSize,
    setTextColor,
    setColor,
    setBackgroundImage,
    setBackdropColor,
    reset,
  };
}
