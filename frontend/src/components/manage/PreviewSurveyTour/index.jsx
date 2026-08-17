import { useTranslation } from "react-i18next";
import { getPreviewTourSteps } from "./steps";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useIntroTour } from "~/hooks/useIntroTour";
import "~/styles/tour.css";

const TOUR_STORAGE_KEY = "preview_survey_tour_completed";
const TOUR_START_DELAY_MS = 500;

export default function PreviewSurveyTourProvider({ children }) {
  const { t } = useTranslation(NAMESPACES.MANAGE);

  useIntroTour({
    storageKey: TOUR_STORAGE_KEY,
    delayMs: TOUR_START_DELAY_MS,
    getSteps: () => getPreviewTourSteps(t),
    labels: {
      next: t("preview_page_tour.step1_next"),
      back: t("preview_page_tour.tour_back"),
      done: t("preview_page_tour.step2_next"),
    },
  });

  return <>{children}</>;
}
