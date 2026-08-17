/**
 * Re-position the intro.js skip (×) button to the corner opposite the
 * tooltip arrow so the two never visually overlap.
 *
 * intro.js renders the arrow on different sides of the tooltip depending on
 * the computed position relative to the highlighted element; the CSS
 * defaults for `.introjs-skipbutton` are direction-based (top-right in LTR,
 * top-left in RTL) and have no knowledge of where the arrow ends up — in
 * edge cases (e.g. RTL `bottom-left-aligned`, or LTR `bottom-right-aligned`)
 * both sit in the same corner and collide. This helper reads the arrow's
 * class list after intro.js positions it and sets inline style on the skip
 * button to steer clear.
 *
 * Arrow-class → actual CSS corner (intro.js v8 — see introjs.css):
 *   top            left:10px  top:-10px     → TOP-LEFT corner
 *   top-middle     left:50%   top:-10px     → TOP-CENTER
 *   top-right      right:10px top:-10px     → TOP-RIGHT
 *   bottom         left:10px  bottom:-10px  → BOTTOM-LEFT
 *   bottom-middle  left:50%   bottom:-10px  → BOTTOM-CENTER
 *   bottom-right   right:10px bottom:-10px  → BOTTOM-RIGHT
 *   left           left:-10px top:10px      → LEFT edge, top
 *   left-bottom    left:-10px bottom:10px   → LEFT edge, bottom
 *   right          right:-10px top:10px     → RIGHT edge, top
 *   right-bottom   right:-10px bottom:10px  → RIGHT edge, bottom
 *
 * Note: intro.js v8 has no `top-left` / `bottom-left` classes — the
 * "default" positions (plain `top` / `bottom`) are rendered on the LEFT.
 *
 * Call from `intro.onAfterChange`. Internally retries on a microtask and a
 * short timeout so we catch whichever frame intro.js actually commits the
 * arrow class on.
 */

const ARROW_ON_LEFT = ["top", "bottom", "left", "left-bottom"];
const ARROW_ON_RIGHT = ["top-right", "bottom-right", "right", "right-bottom"];

function applySkipButtonPosition() {
  const arrow = document.querySelector(".introjs-arrow");
  const skipBtn = document.querySelector(".introjs-skipbutton");
  if (!arrow || !skipBtn) return;

  const classes = Array.from(arrow.classList);
  const onLeft = ARROW_ON_LEFT.some((c) => classes.includes(c));
  const onRight = ARROW_ON_RIGHT.some((c) => classes.includes(c));

  if (onLeft) {
    skipBtn.style.setProperty("right", "-10px", "important");
    skipBtn.style.setProperty("left", "auto", "important");
  } else if (onRight) {
    skipBtn.style.setProperty("right", "auto", "important");
    skipBtn.style.setProperty("left", "-10px", "important");
  } else {
    skipBtn.style.removeProperty("right");
    skipBtn.style.removeProperty("left");
  }
}

export function positionSkipButtonAwayFromArrow() {
  applySkipButtonPosition();
  requestAnimationFrame(applySkipButtonPosition);
  setTimeout(applySkipButtonPosition, 150);
}

export const RTL_POSITION_MAP = {
  left: "right",
  right: "left",
  "bottom-right-aligned": "bottom-left-aligned",
  "bottom-left-aligned": "bottom-right-aligned",
};

export function mirrorPositionForRtl(position, rtl) {
  if (!rtl) return position;
  return RTL_POSITION_MAP[position] || position;
}

export function buildStepIntroHtml(introText) {
  return `<div class="tour-step-body">${introText}</div>`;
}

export function buildIntroOptions({ steps, labels }) {
  return {
    steps,
    showBullets: false,
    showStepNumbers: false,
    exitOnOverlayClick: false,
    showSkipButton: false,
    disableInteraction: true,
    autoPosition: false,
    hidePrev: false,
    nextLabel: labels.next,
    prevLabel: labels.back,
    doneLabel: labels.done,
    tooltipClass: "tour-tooltip",
    highlightClass: "tour-highlight",
    scrollToElement: false,
    scrollPadding: 0,
    helperElementPadding: 0,
  };
}

export function setNextButtonText({ rtl, text }) {
  const nextBtn = document.querySelector(".introjs-nextbutton");
  if (nextBtn && text) {
    nextBtn.textContent = rtl ? `${text} ←` : `${text} →`;
  }
  return nextBtn;
}

export function setPrevButtonText({ rtl, text }) {
  const prevBtn = document.querySelector(".introjs-prevbutton");
  if (!prevBtn) return null;
  prevBtn.classList.remove("introjs-disabled", "introjs-hidden");
  prevBtn.removeAttribute("style");
  prevBtn.style.display = "inline-flex";
  prevBtn.onclick = null;
  if (text) {
    prevBtn.textContent = rtl ? `→ ${text}` : `← ${text}`;
  }
  return prevBtn;
}

export function clearHighlightedElementClasses() {
  document
    .querySelector(".introjs-showElement")
    ?.classList.remove("introjs-showElement", "introjs-relativePosition");
}

const TOUR_COMPLETED_VALUE = "true";

// Storage format:
//   missing  → fresh start at step 0
//   "true"   → tour completed, don't show
//   numeric  → resume at that step index
export function readTourProgress(storageKey) {
  const raw = localStorage.getItem(storageKey);
  if (raw === TOUR_COMPLETED_VALUE) return { completed: true, startStep: 0 };
  const parsed = parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return { completed: false, startStep: parsed };
  }
  return { completed: false, startStep: 0 };
}

export function markTourCompleted(storageKey) {
  localStorage.setItem(storageKey, TOUR_COMPLETED_VALUE);
}

export function saveTourStep(storageKey, stepIndex) {
  if (localStorage.getItem(storageKey) === TOUR_COMPLETED_VALUE) return;
  localStorage.setItem(storageKey, String(Math.max(0, stepIndex | 0)));
}
