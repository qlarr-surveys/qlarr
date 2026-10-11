// Hard per-type caps on response file uploads, enforced by the backend. The run
// renderer validates against these whenever the designer's max file size is
// unset or larger.
const MB = 1024 * 1024;

export const MAX_FILE_SIZE_BYTES = 10 * MB;
export const MAX_VIDEO_FILE_SIZE_BYTES = 60 * MB;
