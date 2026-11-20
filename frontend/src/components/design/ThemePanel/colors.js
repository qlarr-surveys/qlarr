import {
  contrastRatio,
  parseColor,
  relativeLuminance,
} from "@qlarr/design-core/utils/surveyTheme";

/**
 * Colour helpers for the theme panel.
 *
 * Survey themes hold colours in whatever notation wrote them last: the older
 * picker saved `rgba(...)`, the new one saves hex, and the defaults are hex.
 * Everything here parses both so a preset still reads as selected after a
 * round trip, and so the contrast note can be computed from either.
 */

export const HEX_INPUT = /^#?[0-9a-f]{6}$/i;

const channelHex = (channel) =>
  Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0");

/**
 * Lowercase `#rrggbb` for the colour's channels, ignoring how opaque it is, or
 * null when it cannot be parsed. This is the hue a translucent colour is built
 * from — what the picker and the hex box edit, with opacity set beside them.
 */
export function hexOf(value) {
  const parsed = parseColor(value);
  if (!parsed) {
    return null;
  }
  return `#${channelHex(parsed.r)}${channelHex(parsed.g)}${channelHex(parsed.b)}`;
}

/** How opaque a colour is, 0-1; anything unparseable reads as fully opaque. */
export function alphaOf(value) {
  const parsed = parseColor(value);
  return parsed ? parsed.a : 1;
}

/**
 * True when two colour notations describe the same colour, opacity included.
 *
 * Opacity counts because a preset can be translucent: a backdrop list is every
 * shade of "mostly see-through", and comparing those on their channels alone
 * would leave each one looking unselected however exactly it was matched.
 * Alpha is compared loosely, since it round-trips through a percentage.
 */
export function sameColor(a, b) {
  const left = parseColor(a);
  const right = parseColor(b);
  if (!left || !right) {
    return false;
  }
  return (
    left.r === right.r &&
    left.g === right.g &&
    left.b === right.b &&
    Math.abs(left.a - right.a) < 0.005
  );
}

/**
 * What a picked `{ r, g, b, a }` is written as: hex while the colour is fully
 * opaque, so an untouched colour still round-trips as the hex everything else
 * writes, and `rgba(...)` once it is not — the notation the theme has always
 * used for a translucent colour.
 */
export function fromRgb({ r, g, b, a }) {
  if (a === undefined || a >= 1) {
    return `#${channelHex(r)}${channelHex(g)}${channelHex(b)}`;
  }
  const rounded = Math.round(Math.max(0, a) * 100) / 100;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${rounded})`;
}

/**
 * The luminance at which a dark tick starts to out-contrast a white one.
 *
 * Solving `1.05 / (L + 0.05) = (L + 0.05) / 0.05` puts the crossover here, not
 * at the midpoint it looks like it should be at: a swatch has to be really
 * quite light before white marks on it beat dark ones. Half-opaque washes land
 * squarely in the stretch between the two, which is where guessing at 0.5 used
 * to put a white tick on a grey swatch at barely 2:1.
 */
const TICK_CROSSOVER = 0.179;

/**
 * True when a swatch needs a dark tick to stay visible on it.
 *
 * A translucent colour is judged as it will actually be drawn rather than as
 * the colour it is mixed from: composited over the light panel behind it, a
 * barely-there wash of black is a pale grey swatch, and a white tick on it
 * would be the one thing nobody could see.
 */
export function isLight(value) {
  const parsed = parseColor(value);
  if (!parsed) {
    return false;
  }
  const overPanel = (channel) => channel * parsed.a + 255 * (1 - parsed.a);
  return (
    relativeLuminance({
      r: overPanel(parsed.r),
      g: overPanel(parsed.g),
      b: overPanel(parsed.b),
    }) > TICK_CROSSOVER
  );
}

// Parsing and the contrast check live in design-core, shared with the AI theme agent.
export { contrastRatio, parseColor };
