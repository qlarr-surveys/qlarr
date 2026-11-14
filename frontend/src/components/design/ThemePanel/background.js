import {
  BG_COLOR,
  NO_BACKDROP,
  TRANSPARENT,
} from "@qlarr/design-core/constants/surveyTheme";

/**
 * How the panel reads and writes a survey's background, against the storage
 * contract set out beside these constants in design-core: `bgColor` is what
 * every renderer paints, so under an image it holds the backdrop wash.
 *
 * The `with…` functions take the stored theme and return the next one. None
 * of these knows about Redux, so the rules can be read on their own.
 */

/** What `bgColor` holds under an image for a given backdrop setting. */
export const washOf = (backdrop) =>
  backdrop && backdrop !== NO_BACKDROP ? backdrop : TRANSPARENT;

/**
 * The backdrop a survey shows over its image, or null for none.
 *
 * Read off what is painted rather than off the setting, so the panel says what
 * the survey looks like whatever wrote it last — including a survey from before
 * the setting, whose colour over its image was its tint all along.
 */
export const shownBackdrop = (theme) => {
  const painted = theme?.bgColor || BG_COLOR;
  return painted === TRANSPARENT ? null : painted;
};

/** The theme with its backdrop set: the setting, and the wash that paints it. */
export const withBackdrop = (theme, color) => ({
  ...theme,
  backdropColor: color || NO_BACKDROP,
  bgColor: washOf(color),
});

/**
 * The theme as an image arrives on a survey that had none. The background
 * colour steps aside to wait for the image to go, and the wash takes its place:
 * the backdrop the survey had before, or none — which is also what the old
 * panel did to a survey's colour when it was given an image.
 */
export const withImageAdded = (theme) => {
  const backdrop = theme?.backdropColor || NO_BACKDROP;
  return {
    ...theme,
    backdropColor: backdrop,
    bgColorWithoutImage: theme?.bgColor,
    bgColor: washOf(backdrop),
  };
};

/**
 * The theme as its image goes: the colour that was set aside comes back —
 * unless there is none, as on a survey from before the setting, or it is the
 * transparent colour the old panel left behind when it removed an image. Those
 * get the default colour rather than a survey with no background at all. The
 * backdrop setting stays, ready for the next image.
 */
export const withImageRemoved = (theme) => {
  const { bgColorWithoutImage: kept, ...rest } = theme || {};
  return {
    ...rest,
    bgColor: kept && kept !== TRANSPARENT ? kept : BG_COLOR,
  };
};
