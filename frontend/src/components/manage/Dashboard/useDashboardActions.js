import { useMemo } from "react";
import { Add, FileUploadOutlined } from "@mui/icons-material";
import { isSurveyAdmin } from "~/constants/roles";
import { useAiDashboardAction } from "~/features/ai/dashboardAction";

/**
 * The action cards above the survey list.
 *
 * Each entry is `{ key, titleKey, descriptionKey, icon, tone, onClick }`.
 * `tone` is "default" or "ai"; ActionCards maps it to a colour.
 *
 * The AI card comes from a seam (`~/features/ai/dashboardAction`) that returns
 * null in this repo and a card in the hosted fork, so the list is two or three
 * entries long and the grid lays out either from the same CSS.
 */
export function useDashboardActions({ onCreateSurvey, onImportSurvey }) {
  const aiAction = useAiDashboardAction();
  // Gated as a whole, matching the buttons this replaced: an analyst sees the
  // survey list with no way to add to it.
  const canCreate = isSurveyAdmin();

  return useMemo(() => {
    if (!canCreate) {
      return [];
    }

    return [
      {
        key: "create",
        titleKey: "create_new_survey",
        descriptionKey: "action_cards.create.description",
        icon: Add,
        tone: "default",
        onClick: onCreateSurvey,
      },
      {
        key: "import",
        titleKey: "import_survey",
        descriptionKey: "action_cards.import.description",
        icon: FileUploadOutlined,
        tone: "default",
        onClick: onImportSurvey,
      },
      ...(aiAction ? [aiAction] : []),
    ];
  }, [canCreate, aiAction, onCreateSurvey, onImportSurvey]);
}
