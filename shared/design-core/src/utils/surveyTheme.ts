// @ts-nocheck — loose JS-origin logic; internals stay untyped, public API typed at index.ts
import { BG_COLOR, NO_BACKDROP, TRANSPARENT } from "../constants/surveyTheme";

/*
 * Survey-theme rules shared by the theme panel and the AI theme agent: reading
 * colours, the contrast check, and how a background image changes the theme.
 */

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGB = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

/**
 * `{ r, g, b, a }` with channels 0-255 and alpha 0-1, or null if unparseable.
 *
 * Survey themes hold colours in whatever notation wrote them last: the older
 * picker saved `rgba(...)`, the new one saves hex, and the defaults are hex.
 */
export function parseColor(value) {
  if (typeof value !== "string") {
    return null;
  }
  const raw = value.trim();

  const short = HEX_SHORT.exec(raw);
  if (short) {
    const [, r, g, b] = short;
    return {
      r: parseInt(r + r, 16),
      g: parseInt(g + g, 16),
      b: parseInt(b + b, 16),
      a: 1,
    };
  }

  const long = HEX_LONG.exec(raw);
  if (long) {
    return {
      r: parseInt(long[1], 16),
      g: parseInt(long[2], 16),
      b: parseInt(long[3], 16),
      a: 1,
    };
  }

  const rgb = RGB.exec(raw);
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : Number(rgb[4]);
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: Number.isFinite(alpha) ? alpha : 1,
    };
  }

  return null;
}

export const relativeLuminance = ({ r, g, b }) => {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

/**
 * The WCAG 2.2 contrast ratio between two colours, rounded to one decimal, or
 * null when either colour is translucent or unparseable — a ratio against a
 * colour we cannot see through would be a guess, and a wrong accessibility
 * claim is worse than none.
 */
export function contrastRatio(foreground, background) {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg || fg.a < 1 || bg.a < 1) {
    return null;
  }
  const light = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const dark = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return Math.round(((light + 0.05) / (dark + 0.05)) * 10) / 10;
}

/*
 * How a survey's background is read and written, against the storage contract
 * set out beside the constants in ../constants/surveyTheme: `bgColor` is what
 * every renderer paints, so under an image it holds the backdrop wash.
 *
 * The `with…` functions take the stored theme and return the next one.
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
