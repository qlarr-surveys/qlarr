import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { getDesignTourSteps } from "./steps";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useIntroTour } from "~/hooks/useIntroTour";
import "~/styles/tour.css";
import "./tour.css";

const TOUR_STORAGE_KEY = "design_tour_completed";
const QUESTION_TYPES_STEP = 2;
const QUESTION_TYPES_SELECTOR = '[data-tour="question-types-list"]';
// Allow time for virtualized lists and lazy components to mount before starting tour
const TOUR_START_DELAY_MS = 2000;
const REMIND_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">' +
  '<path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 ' +
  '0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>';

function clampQuestionTypes() {
  const el = document.querySelector(QUESTION_TYPES_SELECTOR);
  const sidebar = el?.parentElement;
  if (!sidebar || !el) return;

  sidebar.scrollTop = 0;
  sidebar.style.overflow = "hidden";

  const sidebarRect = sidebar.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const visibleHeight = sidebarRect.bottom - elRect.top;
  if (visibleHeight > 0) {
    el.style.maxHeight = `${visibleHeight}px`;
    el.style.overflow = "hidden";
  }
}

function unclampQuestionTypes() {
  const el = document.querySelector(QUESTION_TYPES_SELECTOR);
  const sidebar = el?.parentElement;
  if (sidebar) {
    sidebar.style.overflow = "";
  }
  if (el) {
    el.style.maxHeight = "";
    el.style.overflow = "";
  }
}

function isSurveyEmpty(designState) {
  const groups = designState.Survey?.children;
  if (!groups || groups.length === 0) return true;

  const regularGroups = groups.filter(
    (g) => designState[g.code]?.groupType === "GROUP"
  );

  if (regularGroups.length !== 1) return false;

  const regularGroup = designState[regularGroups[0].code];
  return !regularGroup?.children || regularGroup.children.length === 0;
}

export default function DesignTourProvider({ children }) {
  const { t } = useTranslation(NAMESPACES.DESIGN_CORE);
  const designState = useSelector((state) => state.designState);

  useIntroTour({
    storageKey: TOUR_STORAGE_KEY,
    enabled: isSurveyEmpty(designState),
    delayMs: TOUR_START_DELAY_MS,
    deps: [designState],
    getSteps: () => getDesignTourSteps(t),
    labels: {
      next: t("tour_next"),
      back: t("tour_back"),
      done: t("tour_done"),
    },
    buildTitle: (step, i, steps) =>
      `<div class="design-tour-step-counter">${t("tour_step_counter", {
        current: i + 1,
        total: steps.length,
      })}</div>${step.title}`,
    onBeforeChange: (_element, stepIndex) => {
      const leftContent = document.querySelector('[class*="leftContent"]');
      if (leftContent) leftContent.scrollTop = 0;
      const virtuosoScroller = document.querySelector(
        '[data-tour="content-panel"] [data-test-id="virtuoso-scroller"]'
      );
      if (virtuosoScroller) virtuosoScroller.scrollTop = 0;

      if (stepIndex === QUESTION_TYPES_STEP) {
        clampQuestionTypes();
      } else {
        unclampQuestionTypes();
      }
    },
    customizePrevOnFirstStep: ({ prevBtn, intro }) => {
      prevBtn.classList.remove("introjs-disabled", "introjs-hidden");
      prevBtn.removeAttribute("style");
      prevBtn.style.display = "inline-flex";
      prevBtn.textContent = "";
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = REMIND_ICON;
      prevBtn.appendChild(iconSpan);
      prevBtn.appendChild(
        document.createTextNode(` ${t("tour_remind_me_later")}`)
      );
      prevBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        intro.exit();
      };
    },
    onExitExtra: () => {
      unclampQuestionTypes();
      window.scrollTo(0, 0);
    },
  });

  return <>{children}</>;
}
