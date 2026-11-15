import { useCallback, useRef, useState } from "react";

export const sectionDomId = (id) => `settings-section-${id}`;
export const headingDomId = (id) => `settings-heading-${id}`;

// A section counts as the one being read once its top is this close to the
// top of the canvas.
const READING_LINE = 96;
// Gap left above a section the nav scrolls to.
const JUMP_OFFSET = 16;
// A smooth scroll longer than this is a blur rather than a cue, so it jumps.
const SMOOTH_LIMIT = 500;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Keeps the Settings nav and the canvas beside it in step: picking a section
 * scrolls the canvas to it and moves focus to its heading, and scrolling the
 * canvas moves the nav's highlight to whichever section is being read.
 *
 * While a picked scroll is still moving, the canvas passes through the
 * sections above the target; those scroll events are ignored, or the highlight
 * would flicker through each of them on the way.
 */
export default function useSectionSpy(canvasRef, ids) {
  const [active, setActive] = useState(ids[0]);
  const jumping = useRef(false);
  const jumpLock = useRef(0);

  const onScroll = useCallback(() => {
    if (jumping.current) {
      if (Date.now() < jumpLock.current) {
        jumpLock.current = Date.now() + 200;
        return;
      }
      jumping.current = false;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const top = canvas.getBoundingClientRect().top;
    let current = ids[0];
    for (const id of ids) {
      const section = document.getElementById(sectionDomId(id));
      if (section && section.getBoundingClientRect().top - top <= READING_LINE) {
        current = id;
      }
    }
    setActive(current);
  }, [canvasRef, ids]);

  const jumpTo = useCallback(
    (id) => {
      setActive(id);
      const canvas = canvasRef.current;
      const section = document.getElementById(sectionDomId(id));
      if (!canvas || !section) {
        return;
      }
      jumping.current = true;
      jumpLock.current = Date.now() + 200;
      const offset =
        section.getBoundingClientRect().top -
        canvas.getBoundingClientRect().top +
        canvas.scrollTop -
        JUMP_OFFSET;
      const target = Math.max(
        0,
        Math.min(offset, canvas.scrollHeight - canvas.clientHeight)
      );
      const instant =
        prefersReducedMotion() ||
        Math.abs(target - canvas.scrollTop) > SMOOTH_LIMIT;
      if (instant) {
        canvas.scrollTop = target;
      } else {
        canvas.scrollTo({ top: target, behavior: "smooth" });
      }
      // Focus follows the jump, so the keyboard and the screen reader carry
      // on from the section rather than from the nav.
      const heading = document.getElementById(headingDomId(id));
      setTimeout(
        () => heading?.focus({ preventScroll: true }),
        instant ? 0 : 380
      );
    },
    [canvasRef]
  );

  return { active, jumpTo, onScroll };
}
