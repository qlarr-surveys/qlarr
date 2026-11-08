import React from "react";
import { Trash2, Upload } from "lucide-react";
import { buildResourceUrl } from "~/networking/common";
import { useResourceUpload } from "~/hooks/useResourceUpload";
import ColorField from "./ColorField";
import styles from "./ThemePanel.module.css";
import { SURVEY_BACKGROUNDS } from "./constants";

/**
 * The survey background: a colour or an image, never both. An image is painted
 * over the colour, so offering the two side by side would let someone set a
 * colour that nothing shows — the type switch makes the exchange explicit, and
 * dropping the image puts the colour back.
 */
function BackgroundField({ t, values, onColorChange, onImageChange }) {
  const uploadResource = useResourceUpload();
  const hasImage = Boolean(values.backgroundImage);

  const [mode, setMode] = React.useState(hasImage ? "image" : "color");
  const [dragging, setDragging] = React.useState(false);
  const [progress, setProgress] = React.useState(null);
  const [error, setError] = React.useState("");

  // An upload lands asynchronously; the panel follows it into image mode.
  React.useEffect(() => {
    if (hasImage) setMode("image");
  }, [hasImage]);

  const chooseMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setError("");
    if (next === "color" && hasImage) {
      onImageChange(null);
    }
  };

  const upload = (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setError(t("theme_background_not_an_image"));
      return;
    }
    setError("");
    setProgress(0);
    uploadResource(file, { onProgress: setProgress })
      .then((response) => {
        if (response) onImageChange(response.name);
      })
      .finally(() => setProgress(null));
  };

  const uploading = progress !== null;

  const labelOf = (option) =>
    option === "image"
      ? t("theme_background_type_image")
      : t("theme_background_type_color");

  return (
    <>
      <div className={styles.field}>
        <div className={styles.fieldHead}>
          <span className={styles.fieldLabel}>{t("theme_background_type")}</span>
          <span className={styles.fieldValue}>{labelOf(mode)}</span>
        </div>
        <div
          role="radiogroup"
          aria-label={t("theme_background_type")}
          className={styles.chipGroup}
        >
          {["color", "image"].map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={mode === option}
              onClick={() => chooseMode(option)}
              className={`${styles.chip} ${mode === option ? styles.chipOn : ""}`}
            >
              <span className={styles.chipLabel} data-label={labelOf(option)}>
                {labelOf(option)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {mode === "color" ? (
        <ColorField
          t={t}
          name="surveyBg"
          label={t("theme_background_color")}
          value={values.surveyBg}
          presets={SURVEY_BACKGROUNDS}
          onChange={onColorChange}
        />
      ) : (
        <div className={styles.field}>
          <div className={styles.fieldHead}>
            <span className={styles.fieldLabel}>
              {t("theme_background_image")}
            </span>
            <span className={styles.fieldValue}>
              {hasImage
                ? t("theme_background_type_image")
                : t("theme_background_none")}
            </span>
          </div>

          {hasImage && !uploading ? (
            <div className={styles.imageCard}>
              <img
                src={buildResourceUrl(values.backgroundImage)}
                alt=""
                className={styles.imageThumb}
              />
              <div className={styles.imageActions}>
                <label className={styles.imageReplace}>
                  {t("theme_replace_background")}
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      upload(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  // Dropping the image leaves the survey on a colour, so the
                  // panel goes back to showing which colour that is.
                  onClick={() => chooseMode("color")}
                  className={styles.imageRemove}
                >
                  <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" />
                  {t("theme_remove_background")}
                </button>
              </div>
            </div>
          ) : (
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                upload(event.dataTransfer.files?.[0]);
              }}
              className={`${styles.dropZone} ${dragging ? styles.dropZoneOver : ""}`}
            >
              <Upload size={18} strokeWidth={1.5} aria-hidden="true" />
              <span className={styles.dropTitle}>
                {uploading
                  ? t("theme_uploading_background")
                  : dragging
                    ? t("theme_drop_to_upload")
                    : t("theme_upload_background")}
              </span>
              {uploading ? (
                <span className={styles.progressTrack}>
                  <span
                    className={styles.progressBar}
                    style={{ width: `${progress}%` }}
                  />
                </span>
              ) : (
                <span className={styles.dropHint}>
                  {t("theme_upload_background_hint")}
                </span>
              )}
              <input
                hidden
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(event) => {
                  upload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          )}

          {error && (
            <p role="alert" className={`${styles.help} ${styles.helpError}`}>
              {error}
            </p>
          )}
        </div>
      )}

      <p className={styles.note}>{t("theme_background_note")}</p>
    </>
  );
}

export default React.memo(BackgroundField);
