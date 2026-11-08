// Stops every edit in a read-only preview at its root, whatever component it
// comes from: typing, pasting, dragging, and using controls. Viewing still
// works — scrolling, selecting text, clicking a question to see its setup — and
// so does anything marked `data-preview-allow`, a tab, or opening a collapsible
// in the content (its settings button sits inside it and stays blocked).
const ALLOWED = "[data-preview-allow], [role='tab'], .collapsible-button";
const DENIED = ".collapsible-settings-button";
const CONTROLS = [
  "button",
  "a[href]",
  "select",
  "label",
  "input[type='checkbox']",
  "input[type='radio']",
  "input[type='file']",
  "[role='button']",
  "[role='checkbox']",
  "[role='switch']",
  "[role='radio']",
  "[role='combobox']",
  "[role='slider']",
  "[role='menuitem']",
  "[role='option']",
].join(", ");
const EDITABLE = "input, textarea, [contenteditable='true'], [role='combobox']";
const VIEWING_KEYS = [
  "Tab",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
];

const ALWAYS_BLOCKED = ["beforeinput", "paste", "cut", "drop", "dragstart", "submit", "change"];
const POINTER = ["click", "dblclick", "mousedown", "pointerdown", "touchstart"];

function blocks(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;
  if (!target.closest(DENIED) && target.closest(ALLOWED)) return false;
  if (ALWAYS_BLOCKED.includes(event.type)) return true;
  if (event.type === "keydown") {
    // Shortcuts (copy, find) pass; an edit through one is cut at beforeinput.
    if (event.ctrlKey || event.metaKey) return false;
    if (!target.closest(EDITABLE)) return false;
    const opensList = target.closest("[role='combobox']");
    return opensList || !VIEWING_KEYS.includes(event.key);
  }
  return !!target.closest(CONTROLS);
}

function stop(event) {
  if (!blocks(event)) return;
  event.preventDefault();
  event.stopPropagation();
}

const EVENTS = [...ALWAYS_BLOCKED, ...POINTER, "keydown"];

/** Guards `node` and everything in it; returns the undo. */
export function guardPreview(node) {
  EVENTS.forEach((type) => node.addEventListener(type, stop, true));
  return () => EVENTS.forEach((type) => node.removeEventListener(type, stop, true));
}
