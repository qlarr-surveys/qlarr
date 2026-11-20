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

// Shortcuts that only read: copy, select all, find.
const READING_SHORTCUTS = ["c", "a", "f"];

function blocks(event, live) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;
  if (!target.closest(DENIED) && target.closest(ALLOWED)) return false;
  if (ALWAYS_BLOCKED.includes(event.type)) return true;
  if (event.type === "keydown") {
    // Shortcuts (copy, find) pass; an edit through one is cut at beforeinput.
    // On the live design an editor shortcut (undo) would change the survey,
    // so only the reading ones pass there.
    if (event.ctrlKey || event.metaKey) return live && !READING_SHORTCUTS.includes(event.key.toLowerCase());
    if (!target.closest(EDITABLE)) return false;
    const opensList = target.closest("[role='combobox']");
    return opensList || !VIEWING_KEYS.includes(event.key);
  }
  return !!target.closest(CONTROLS);
}

const EVENTS = [...ALWAYS_BLOCKED, ...POINTER, "keydown"];

/**
 * Guards `node` and everything in it; returns the undo. `live` is the real
 * design made read-only for a while, where no store ignores edits.
 */
export function guardPreview(node, { live = false } = {}) {
  const stop = (event) => {
    if (!blocks(event, live)) return;
    event.preventDefault();
    event.stopPropagation();
  };
  EVENTS.forEach((type) => node.addEventListener(type, stop, true));
  return () => EVENTS.forEach((type) => node.removeEventListener(type, stop, true));
}
