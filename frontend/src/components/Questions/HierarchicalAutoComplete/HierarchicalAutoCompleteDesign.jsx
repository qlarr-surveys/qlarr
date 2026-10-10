import React, { useState } from "react";

import { useSelector, useDispatch } from "react-redux";
import { Alert, ButtonBase, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import { useTranslation } from "react-i18next";
import { changeAttribute, changeResources } from "~/state/design/designState";
import styles from "../AutoComplete/AutoComplete.module.css";
import LoadingDots from "~/components/common/LoadingDots";
import { useService } from "~/hooks/use-service";
import {
  formatlocalDateTime,
  serverDateTimeToLocalDateTime,
} from "~/utils/DateUtils";
import { processError, PROCESSED_ERRORS } from "~/utils/errorsProcessor";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { downloadCsv } from "~/analytics/crosstabs/csv";
import ChoiceQuestion from "~/components/Questions/Choice/ChoiceDesign";

// A hierarchical autocomplete is a `multiple_text` sibling: the levels ARE the
// answers (each child holds its own string value, its label is the level name,
// translated through the normal answer-label flow). On top of that it carries an
// external data resource (the rows), uploaded/downloaded as one CSV — a column per
// (language, level), one value per cell. Each upload replaces the data entirely.
function HierarchicalAutoCompleteDesign({ code, t, designMode, langInfo }) {
  const designService = useService("design");
  const dispatch = useDispatch();
  const { t: tManage } = useTranslation(NAMESPACES.MANAGE);
  const [isUploading, setUploading] = useState(false);
  const [isDownloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  // Languages the most recent upload imported — shown so it's always clear
  // which languages the new data carries.
  const [imported, setImported] = useState(null);

  const state = useSelector((s) => s.designState[code]);
  const languagesList = useSelector(
    (s) => s.designState.langInfo.languagesList || []
  );
  // The level names (main language) for the CSV headers — e.g. "Country (en)".
  // Falls back to "Level N" when a level has no label yet.
  const levelLabels = useSelector((s) => {
    const q = s.designState[code];
    const mainLang = s.designState.langInfo?.mainLang;
    return (q.children || []).map((child, i) => {
      const raw = s.designState[child.qualifiedCode]?.content?.[mainLang]?.label;
      const text = (raw || "").replace(/<[^>]*>/g, "").trim();
      return text || `Level ${i + 1}`;
    });
  });

  // Metadata of the uploaded resource:
  // { name, rowCount, levels, languages, imported, lastModified }.
  const meta = state.hierarchicalAutoComplete;
  const levelCount = (state.children || []).length;
  const surveyLangs = languagesList.map((l) => l.code);
  const presentLangs = meta?.languages || [];
  const missingLangs = surveyLangs.filter((l) => !presentLangs.includes(l));

  // The uploaded data has a fixed number of levels (columns per language). If
  // the author later changes the answer count, the stored data no longer matches
  // — we surface an error so they re-upload. The data itself is left untouched.
  // Renaming a level doesn't change the count, so it's safe.
  const levelsMismatch =
    typeof meta?.levels === "number" && meta.levels !== levelCount;

  const handleUpload = (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    setImported(null);
    designService
      .uploadHierarchicalResource(file, code, levelCount)
      .then((response) => {
        setUploading(false);
        setImported(response.imported || []);
        dispatch(
          changeResources({
            code,
            key: "hierarchicalAutoComplete",
            value: response.name,
          })
        );
        dispatch(
          changeAttribute({
            code,
            key: "hierarchicalAutoComplete",
            value: response,
          })
        );
      })
      .catch((err) => {
        setUploading(false);
        const processed =
          processError(err) || PROCESSED_ERRORS.UNIDENTIFIED_ERROR;
        setError(tManage(`processed_errors.${processed.name}`));
      });
  };

  const handleDownload = () => {
    setDownloading(true);
    setError(null);
    designService
      // Pass all survey languages (base first) + the level names so the download
      // has a labelled column per (language, level), empty where untranslated — a
      // ready-to-fill template.
      .getHierarchicalCsv(code, surveyLangs, levelLabels)
      .then((blob) =>
        downloadCsv(
          blob,
          meta ? "hierarchical-data.csv" : "hierarchical-template.csv"
        )
      )
      .catch((err) => {
        const processed =
          processError(err) || PROCESSED_ERRORS.UNIDENTIFIED_ERROR;
        setError(tManage(`processed_errors.${processed.name}`));
      })
      .finally(() => setDownloading(false));
  };

  return (
    <>
      {/* Levels == answers: reuse the multiple_text-style editor for the level names. */}
      <ChoiceQuestion
        t={t}
        code={code}
        designMode={designMode}
        langInfo={langInfo}
        type="text"
      />

      <div className={styles.autocompleteMarginTop}>
        {meta && (
          <>
            <p className={styles.largerText}>
              <strong>{t("data_uploaded", "Data uploaded successfully")}</strong>
            </p>
            <p>
              <strong>{t("rows_count", "Rows: ")}</strong> {meta.rowCount}
            </p>
            <p>
              <strong>{t("hierarchical_languages", "Languages: ")}</strong>{" "}
              {presentLangs.join(", ")}
            </p>
            <p>
              <strong>{t("last_modified", "Last modified: ")}</strong>
              {formatlocalDateTime(
                serverDateTimeToLocalDateTime(meta.lastModified)
              )}
            </p>
          </>
        )}

        {meta && levelsMismatch && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {t(
              "hierarchical_levels_mismatch",
              "The uploaded data has {{dataLevels}} levels but this question now has {{levels}}. Please upload the data again.",
              { dataLevels: meta.levels, levels: levelCount }
            )}
          </Alert>
        )}

        {meta && missingLangs.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {t("hierarchical_missing_langs", "No data uploaded for: {{langs}}", {
              langs: missingLangs.join(", "),
            })}
          </Alert>
        )}

        {imported && imported.length > 0 && (
          <Alert
            severity="success"
            sx={{ mb: 1 }}
            onClose={() => setImported(null)}
          >
            {t("hierarchical_imported", "Imported: {{langs}}", {
              langs: imported.join(", "),
            })}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {isUploading ? (
          <div className={styles.buttonContainer}>
            <LoadingDots />
            <br />
            <span>{t("uploading_hierarchical", "Uploading data file")}</span>
          </div>
        ) : (
          <div className={styles.buttonContainer}>
            <div className={styles.optionWrapper}>
              <ButtonBase
                component="label"
                onClick={(e) => e.stopPropagation()}
                disabled={levelCount === 0}
                className={styles.optionCard}
              >
                <UploadFileIcon className={styles.cardIcon} />
                <Typography className={styles.cardTitle}>
                  {meta
                    ? t("replace_hierarchical", "Replace data (CSV)")
                    : t("upload_hierarchical", "Upload data (CSV)")}
                </Typography>
                <input
                  hidden
                  accept=".csv,text/csv"
                  type="file"
                  onChange={handleUpload}
                />
              </ButtonBase>
              <Typography className={styles.cardHint}>
                {t(
                  "upload_hierarchical_hint",
                  'One column per level, per language (headers like "Country (en)"); each cell holds a single value. Each upload replaces all existing data — download first, edit, then upload the full file.'
                )}
              </Typography>
            </div>
            {/* Always available: with no data yet it's an empty template (headers
                only, a column per language and level) to fill in and upload. */}
            <div className={styles.optionWrapper}>
              <ButtonBase
                onClick={handleDownload}
                disabled={isDownloading || levelCount === 0}
                className={styles.optionCard}
              >
                <DownloadIcon className={styles.cardIcon} />
                <Typography className={styles.cardTitle}>
                  {isDownloading
                    ? t("loading_values", "Loading...")
                    : meta
                    ? t("download_hierarchical", "Download data (CSV)")
                    : t(
                        "download_hierarchical_template",
                        "Download template (CSV)"
                      )}
                </Typography>
              </ButtonBase>
              <Typography className={styles.cardHint}>
                {meta
                  ? t(
                      "download_hierarchical_hint",
                      "Download the current data to add or edit a language, then re-upload."
                    )
                  : t(
                      "download_hierarchical_template_hint",
                      "Download an empty template with a column per level and language, fill it in, then upload it."
                    )}
              </Typography>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default React.memo(HierarchicalAutoCompleteDesign);
