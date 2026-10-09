import React from "react";
import { useTranslation } from "react-i18next";
import ValidationItem from "~/components/run/ValidationItem";
import { NAMESPACES } from "~/hooks/useNamespaceLoader";
import { PROCESSED_ERRORS, processError } from "~/utils/errorsProcessor";

/**
 * The backend's caps for a respondent upload (`checkMaxFileSize`): 10MB, or
 * 30MB for a video. In KB, like the designer's max file size validation.
 */
export const MAX_UPLOAD_SIZE_KB = 10240;
export const MAX_VIDEO_UPLOAD_SIZE_KB = 30720;

/** The designer's max file size validation when active, clamped to `capKb`. */
export const effectiveMaxSizeKb = (component, capKb) => {
  const validation = component.validation?.validation_max_file_size;
  const validationMaxSize =
    (validation?.isActive && validation?.max_size) || -1;
  return validationMaxSize > 0 ? Math.min(validationMaxSize, capKb) : capKb;
};

export const fileTooLargeError = (maxSizeKb) => ({
  name: "upload_file_too_large",
  maxSizeKb,
});

/**
 * The inline error for a rejected upload: "too large" for any 413 (the
 * backend's per-type cap, multer's request cap, or a proxy's body limit),
 * a generic "upload failed" for anything else.
 */
export const uploadErrorFrom = (error, maxSizeKb) => {
  const processed = error && processError(error);
  const tooLarge =
    error?.response?.status === 413 ||
    processed === PROCESSED_ERRORS.FILE_TOO_BIG ||
    processed === PROCESSED_ERRORS.MAX_UPLOAD_SIZE_EXCEEDED;
  return tooLarge ? fileTooLargeError(maxSizeKb) : { name: "upload_failed" };
};

/** `10240` → "10 MB", `500` → "500 KB", with the survey language's number format. */
const formatSize = (kb, t, language) => {
  const inMb = kb >= 1024;
  const value = inMb ? kb / 1024 : kb;
  let size;
  try {
    size = new Intl.NumberFormat(language, {
      maximumFractionDigits: 1,
    }).format(value);
  } catch (e) {
    size = String(Math.round(value * 10) / 10);
  }
  return t(inMb ? "file_size_mb" : "file_size_kb", { size });
};

/** An upload error under the question, styled like its validation messages. */
function UploadError({ error }) {
  const { t, i18n } = useTranslation(NAMESPACES.RUN);
  if (!error) return null;
  return (
    <div role="alert">
      <ValidationItem
        name={error.name}
        validation={
          error.maxSizeKb
            ? { size: formatSize(error.maxSizeKb, t, i18n.language) }
            : undefined
        }
      />
    </div>
  );
}

export default UploadError;
