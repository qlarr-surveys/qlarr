// @ts-nocheck — loose JS-origin logic; public API re-exported from index.ts
//
// Format instructions are `{{ ... }}` placeholders embedded in survey content
// (labels, descriptions, custom CSS). At runtime the engine computes each one's
// result and stores it under `format_<name>_<lang>_<n>` in the component's
// values; these helpers substitute those results back into the HTML in document
// order. Pure string work — no React/DOM — so it is shared by the frontend
// renderer and the backend response/export code.

export const getAllFormatInstructions = (inputString) => {
  const regex = /\{\{(.*?)\}\}/g;
  return Array.from(inputString.matchAll(regex), (m) => m[0]);
};

export function replaceFormatInstructions(html, state, name, lang) {
  if (!html || !state) {
    return html;
  }
  const allMatches = getAllFormatInstructions(html);
  allMatches.forEach((match, index) => {
    const replacement = state[`format_${name}_${lang}_${index + 1}`];
    if (replacement !== undefined) {
      html = html.replace(match, replacement);
    }
  });
  return html;
}
