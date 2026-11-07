import React from "react";
import { Download, Upload } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { downloadCsv } from "~/analytics/crosstabs/csv";
import { useService } from "~/hooks/use-service";
import { designStateReceived, setSaving } from "~/state/design/designState";
import { getErrorMessage } from "~/utils/design/codeUtils";
import CheckBox from "./CheckBox";
import styles from "./TranslationPanel.module.css";

/**
 * Translating outside Qlarr: the survey's text leaves as a CSV, comes back
 * filled in, and the whole design is replaced with what the server returns.
 *
 * Importing can overwrite the base language too, which is destructive enough
 * that it is a deliberate choice sitting next to the button rather than a
 * default.
 */
function TranslationsCsv({ t }) {
  const dispatch = useDispatch();
  const designService = useService("design");
  const fileInput = React.useRef(null);
  const isSaving = useSelector((state) => state.designState.isSaving);
  const [overwriteBase, setOverwriteBase] = React.useState(false);
  const [result, setResult] = React.useState(null);

  // handleRequest already surfaced the errors the app handles globally.
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

  const onImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setResult(null);
    dispatch(setSaving(true));
    try {
      const response = await designService.importTranslations(
        file,
        overwriteBase
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
    <>
      <div className={styles.csvActions}>
        <button
          type="button"
          onClick={onExport}
          disabled={isSaving}
          className={styles.csvButton}
        >
          <Download size={14} strokeWidth={1.75} aria-hidden="true" />
          {t("lang_export_csv")}
        </button>
        {/* The file input stays out of the tab order and out of the
            accessibility tree: the button beside it is what anyone — pointer
            or keyboard — actually operates. */}
        <input
          ref={fileInput}
          hidden
          type="file"
          accept=".csv,text/csv"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onImport}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={isSaving}
          className={styles.csvButton}
        >
          <Upload size={14} strokeWidth={1.75} aria-hidden="true" />
          {t("lang_import_csv")}
        </button>
      </div>

      <button
        type="button"
        role="checkbox"
        aria-checked={overwriteBase}
        onClick={() => setOverwriteBase((on) => !on)}
        className={styles.overwrite}
      >
        <CheckBox checked={overwriteBase} className={styles.overwriteBox} />
        <span className={styles.overwriteText}>
          <span className={styles.overwriteLabel}>
            {t("lang_overwrite_base")}
          </span>
          <span className={styles.overwriteHint}>
            {t("lang_overwrite_base_hint")}
          </span>
        </span>
      </button>

      {result?.error && (
        <p role="alert" className={`${styles.note} ${styles.noteBad}`}>
          {result.error}
        </p>
      )}
      {result && !result.error && (
        <p role="status" className={`${styles.note} ${styles.noteGood}`}>
          {result.updated > 0
            ? t("lang_import_done", { count: result.updated })
            : t("lang_import_no_changes")}
        </p>
      )}
    </>
  );
}

export default React.memo(TranslationsCsv);
