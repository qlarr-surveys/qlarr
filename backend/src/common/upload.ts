/**
 * Multipart upload limits. Every `FileInterceptor` passes its own
 * `uploadLimits(...)` so multer aborts once a part exceeds the cap instead of
 * reading an unbounded body into the heap (multer's default is uncapped
 * in-memory storage — an OOM/DoS vector). The abort surfaces as multer's
 * `LIMIT_FILE_SIZE`, which AllExceptionsFilter reshapes to
 * `MaxUploadSizeExceededException`.
 *
 * The cap is per-route on purpose: a `MulterModule.register({ limits })` in
 * AppModule would NOT reach the interceptors — MulterModule isn't global and
 * FileInterceptor injects its options `@Optional()`, so only controllers declared
 * in the registering module see them; everywhere else silently runs uncapped.
 * `upload-limits.unit-spec.ts` fails if any routed multer interceptor lacks a
 * `fileSize` limit.
 *
 * Finer per-type limits for *valid* response uploads (10MB image / 30MB video)
 * still run in the service (`checkMaxFileSize` → `FileTooBigException`) — the
 * multipart cap is only the coarse guard for anything larger than any
 * legitimate upload.
 */
const MB = 1024 * 1024;

/** Default multipart cap (100MB) for admin uploads: survey import ZIP, resources,
 * autocomplete lists. */
export const MAX_UPLOAD_BYTES = 100 * MB;

/**
 * Tighter cap for response-file attachments — 30MB, the largest a *valid*
 * response upload can be (the 30MB video per-type limit). The respondent-facing
 * attach route is public, so we abort at 30MB rather than buffering up to the
 * default 100MB; the finer per-type check still runs in the service afterwards.
 */
export const MAX_RESPONSE_UPLOAD_BYTES = 30 * MB;

/** Cap for a translations CSV: even a large survey in every language is well under 5MB. */
export const MAX_TRANSLATIONS_UPLOAD_BYTES = 5 * MB;

/** Per-route multer options: caps the single `file` part at `maxBytes`. Pass to
 * every FileInterceptor — there is no global fallback. */
export const uploadLimits = (maxBytes: number) => ({
  limits: { fileSize: maxBytes, files: 1 },
});
