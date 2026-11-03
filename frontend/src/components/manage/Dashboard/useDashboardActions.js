import { useMemo } from "react";
import { Add, FileUploadOutlined } from "@mui/icons-material";
import { isSurveyAdmin } from "~/constants/roles";

/**
 * The action cards above the survey list.
 *
 * Each entry is `{ key, titleKey, descriptionKey, icon, onClick }`.
 */
export function useDashboardActions({ onCreateSurvey, onImportSurvey }) {
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
        onClick: onCreateSurvey,
      },
      {
        key: "import",
        titleKey: "import_survey",
        descriptionKey: "action_cards.import.description",
        icon: FileUploadOutlined,
        onClick: onImportSurvey,
      },
    ];
  }, [canCreate, onCreateSurvey, onImportSurvey]);
}
