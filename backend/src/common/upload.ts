/**
 * Multipart upload limits. Every multipart request is capped at a flat 100MB
 * via a single global `MulterModule.register({ limits })` in
 * AppModule, so every FileInterceptor aborts once a part exceeds the cap instead
 * of reading an unbounded body into the heap (multer's default is uncapped
 * in-memory storage — an OOM/DoS vector). The abort surfaces as multer's
 * `LIMIT_FILE_SIZE`, which AllExceptionsFilter reshapes to
 * `MaxUploadSizeExceededException`.
 *
 * Finer per-type limits for *valid* uploads (10MB image / 30MB video) still run
 * in the service (`checkMaxFileSize` → `FileTooBigException`) — the 100MB cap is
 * only the coarse guard for anything larger than any legitimate upload.
 */
const MB = 1024 * 1024;

/** Flat multipart container limit (100MB). */
export const MAX_UPLOAD_BYTES = 100 * MB;

/**
 * Tighter cap for response-file attachments — 30MB, the largest a *valid*
 * response upload can be (the 30MB video per-type limit). The respondent-facing
 * attach route is public, so we abort at 30MB rather than buffering up to the
 * global 100MB; the finer per-type check still runs in the service afterwards.
 */
export const MAX_RESPONSE_UPLOAD_BYTES = 30 * MB;

/** Per-endpoint multer options overriding the global cap for a single route. */
export const uploadLimits = (maxBytes: number) => ({
  limits: { fileSize: maxBytes, files: 1 },
});
