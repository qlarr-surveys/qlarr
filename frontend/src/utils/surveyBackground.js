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
 * Both callers already set `background-size: cover` and a position beside
 * this; those apply to every layer, and a gradient fills whatever it is given.
 */
export function surveyBackgroundLayers(backgroundImage, backdropColor) {
  if (!backgroundImage) {
    return null;
  }
  const image = `url(${buildResourceUrl(backgroundImage)})`;
  return backdropColor
    ? `linear-gradient(${backdropColor}, ${backdropColor}), ${image}`
    : image;
}
