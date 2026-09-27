import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Alert, Box, Button, Checkbox, FormControlLabel } from "@mui/material";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { useService } from "~/hooks/use-service";
import { downloadCsv } from "~/analytics/crosstabs/csv";
import { designStateReceived, setSaving } from "~/state/design/designState";
import { getErrorMessage } from "~/utils/design/codeUtils";

export function TranslationsCsv() {
  const { t } = useTranslation(NAMESPACES.MANAGE);
  const dispatch = useDispatch();
  const designService = useService("design");
  const isSaving = useSelector((s) => s.designState.isSaving);
  const [overrideMainLang, setOverrideMainLang] = useState(false);
  const [result, setResult] = useState(null);

  // handleRequest already showed the errors the app handles globally.
  const onError = (error) =>
    setResult(
      error?.handleGlobally ? null : { error: getErrorMessage(error, t) }
    );

  const onExport = () => {
    setResult(null);
    designService
      .exportTranslations()
      .then((blob) => downloadCsv(blob, "translations.csv"))
      .catch(onError);
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResult(null);
    dispatch(setSaving(true));
    try {
      const response = await designService.importTranslations(
        file,
        overrideMainLang
      );
      dispatch(designStateReceived(response.design));
      setResult({ updated: response.updated });
    } catch (error) {
      onError(error);
    } finally {
      dispatch(setSaving(false));
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="outlined" onClick={onExport} disabled={isSaving}>
          {t("translations.export_csv", "Export CSV")}
        </Button>
        <Button variant="outlined" component="label" disabled={isSaving}>
          {t("translations.import_csv", "Import CSV")}
          <input
            hidden
            type="file"
            accept=".csv,text/csv"
            onChange={onImport}
          />
        </Button>
      </Box>
      <FormControlLabel
        sx={{ mt: 1 }}
        control={
          <Checkbox
            checked={overrideMainLang}
            onChange={(e) => setOverrideMainLang(e.target.checked)}
          />
        }
        label={t(
          "translations.import_csv_override_main",
          "Overwrite Base Language text"
        )}
      />
      {result?.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {result.error}
        </Alert>
      )}
      {result && !result.error && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t("translations.import_csv_done", "Updated {{count}} field(s).", {
            count: result.updated,
          })}
        </Alert>
      )}
    </Box>
  );
}
