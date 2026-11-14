import { isLegacyBackdrop, surveyBackdrop } from "~/constants/theme";
import { buildResourceUrl } from "~/networking/common";

/**
 * The `background-image` layers that paint a survey's canvas, or null when the
 * survey has no image and the background is a flat colour instead.
 *
 * The backdrop is a flat gradient laid over the image rather than an element
 * of its own: a single property then carries both, so the editor preview and
 * the runtime renderer — which paint the image in quite different places —
 * stay identical without either having to wedge a layer between the image and
 * the survey on top of it.
 *
 * A survey saved before the backdrop setting gets the bare image here: its
 * wash is its canvas colour, which `defualtTheme` still paints over the image
 * exactly as the old renderer did. Laying it on here as well would paint it
 * twice. It takes the theme rather than a colour so that no caller can hand
 * it a raw setting — `"none"` included — and skip that distinction.
 *
 * Both callers already set `background-size: cover` and a position beside
 * this; those apply to every layer, and a gradient fills whatever it is given.
 */
export function surveyBackgroundLayers(backgroundImage, theme) {
  if (!backgroundImage) {
    return null;
  }
  const image = `url(${buildResourceUrl(backgroundImage)})`;
  const backdrop = isLegacyBackdrop(theme)
    ? null
    : surveyBackdrop(theme, true);
  return backdrop
    ? `linear-gradient(${backdrop}, ${backdrop}), ${image}`
    : image;
}
