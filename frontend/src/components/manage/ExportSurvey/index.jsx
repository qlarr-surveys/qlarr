import React, { useState } from "react";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useSelector } from "react-redux";
import { useService } from "~/hooks/use-service";
import { fieldStyles as fields, SettingRow } from "~/components/manage/SettingsFields";

/** The Export card's row: download the survey's definition as a ZIP. */
function ExportSurvey() {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const survey = useSelector((state) => state.editState.survey);
  const surveyService = useService("survey");
  const [exporting, setExporting] = useState(false);

  const onClick = () => {
    setExporting(true);
    surveyService
      .exportSurvey(survey.id)
      .catch(() => {})
      .finally(() => setExporting(false));
  };

  return (
    <SettingRow>
      <button
        type="button"
        onClick={onClick}
        disabled={exporting}
        className={fields.secondaryButton}
      >
        {t("edit_survey.export")}
        <Download aria-hidden="true" size={14} strokeWidth={2} />
      </button>
    </SettingRow>
  );
}

export default React.memo(ExportSurvey);
