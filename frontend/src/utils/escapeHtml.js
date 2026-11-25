const ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Text made safe to hand to something that renders its input as HTML, such as
 * CustomTooltip's `title`: every character that could open a tag or an
 * attribute becomes an entity, so the text shows exactly as typed.
 */
export const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => ENTITIES[char]);
