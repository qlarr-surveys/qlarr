export function getPreviewTourSteps(t) {
  return [
    {
      element: '[data-tour="preview-mode-tabs"]',
      position: "bottom",
      tooltipClass: "tour-tooltip",
      title: t("preview_page_tour.step1_title"),
      intro: t("preview_page_tour.step1_intro"),
      nextButtonText: t("preview_page_tour.step1_next"),
    },
    {
      element: '[data-tour="navigation-mode-select"]',
      position: "bottom-right-aligned",
      tooltipClass: "tour-tooltip",
      title: t("preview_page_tour.step2_title"),
      intro: t("preview_page_tour.step2_intro"),
      nextButtonText: t("preview_page_tour.step2_next"),
    },
  ];
}
