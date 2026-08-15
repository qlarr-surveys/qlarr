import { useEffect, useRef } from "react";
import introJs from "intro.js";
import "intro.js/introjs.css";
import { isSessionRtl } from "~/utils/common";
import {
  buildIntroOptions,
  buildStepIntroHtml,
  clearHighlightedElementClasses,
  markTourCompleted,
  mirrorPositionForRtl,
  positionSkipButtonAwayFromArrow,
  readTourProgress,
  saveTourStep,
  setNextButtonText,
  setPrevButtonText,
} from "~/utils/tour";

export function useIntroTour({
  storageKey,
  enabled = true,
  delayMs = 0,
  deps = [],
  getSteps,
  labels,
  buildTitle,
  onBeforeChange,
  customizePrevOnFirstStep,
  onExitExtra,
}) {
  const introInstanceRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const { completed, startStep } = readTourProgress(storageKey);
    if (completed) return undefined;

    const rtl = isSessionRtl();
    const tourSteps = getSteps();
    const resumeStep = Math.min(startStep, Math.max(0, tourSteps.length - 1));

    const timer = setTimeout(() => {
      const steps = tourSteps.map((step, i) => ({
        element: step.element,
        title: buildTitle ? buildTitle(step, i, tourSteps) : step.title,
        intro: buildStepIntroHtml(step.intro),
        position: mirrorPositionForRtl(step.position, rtl),
        tooltipClass: step.tooltipClass,
      }));

      const intro = introJs();
      introInstanceRef.current = intro;

      intro.setOptions(buildIntroOptions({ steps, labels }));

      if (onBeforeChange) {
        intro.onBeforeChange(function (element, stepIndex) {
          onBeforeChange(element, stepIndex);
          return true;
        });
      }

      intro.onAfterChange(function () {
        const stepIndex = this.getCurrentStep();
        const step = tourSteps[stepIndex];
        if (!step) return;

        setTimeout(() => {
          positionSkipButtonAwayFromArrow();

          const isLastStep = stepIndex === tourSteps.length - 1;
          if (!isLastStep) {
            setNextButtonText({
              rtl,
              text: step.nextButtonText || labels.next,
            });
          }

          if (stepIndex === 0) {
            if (customizePrevOnFirstStep) {
              const prevBtn = document.querySelector(".introjs-prevbutton");
              if (prevBtn) customizePrevOnFirstStep({ prevBtn, intro });
            } else {
              const prevBtn = document.querySelector(".introjs-prevbutton");
              if (prevBtn) {
                prevBtn.style.display = "none";
                prevBtn.onclick = null;
              }
            }
          } else {
            setPrevButtonText({
              rtl,
              text: step.prevButtonText || labels.back,
            });
          }
        }, 0);
      });

      intro.onComplete(function (currentStep, reason) {
        if (reason === "done") {
          markTourCompleted(storageKey);
        } else {
          saveTourStep(storageKey, currentStep ?? 0);
        }
      });

      intro.onExit(function () {
        const stepIndex = this.getCurrentStep();
        saveTourStep(storageKey, stepIndex ?? 0);
        clearHighlightedElementClasses();
        onExitExtra?.();
      });

      intro.start();
      if (resumeStep > 0) {
        intro.goToStep(resumeStep + 1);
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
      introInstanceRef.current?.exit(true);
      onExitExtra?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
