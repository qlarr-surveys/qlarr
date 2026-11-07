/**
 * Colour helpers for the theme panel.
 *
 * Survey themes hold colours in whatever notation wrote them last: the older
 * picker saved `rgba(...)`, the new one saves hex, and the defaults are hex.
 * Everything here parses both so a preset still reads as selected after a
 * round trip, and so the contrast note can be computed from either.
 */

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGB = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

export const HEX_INPUT = /^#?[0-9a-f]{6}$/i;

/** `{ r, g, b, a }` with channels 0-255 and alpha 0-1, or null if unparseable. */
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

const channelHex = (channel) =>
  Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0");

/** Lowercase `#rrggbb`, or null for a colour that has no opaque hex form. */
export function toHex(value) {
  const parsed = parseColor(value);
  if (!parsed || parsed.a < 1) {
    return null;
  }
  return `#${channelHex(parsed.r)}${channelHex(parsed.g)}${channelHex(parsed.b)}`;
}

/** True when two colour notations describe the same opaque colour. */
export function sameColor(a, b) {
  const left = toHex(a);
  return left !== null && left === toHex(b);
}

/** The value `<input type="color">` can show — it only accepts `#rrggbb`. */
export function toPickerValue(value, fallback) {
  return toHex(value) || toHex(fallback) || "#000000";
}

const relativeLuminance = ({ r, g, b }) => {
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

/** True when a swatch needs a dark tick to stay visible on it. */
export function isLight(value) {
  const parsed = parseColor(value);
  return parsed ? relativeLuminance(parsed) > 0.5 : false;
}
