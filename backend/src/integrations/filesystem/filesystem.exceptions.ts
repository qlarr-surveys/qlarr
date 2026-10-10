import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * A requested file is missing / an upload was empty. Renders a
 * `{ message, error }` body with 404.
 */
export class ResourceNotFoundException extends HttpException {
  constructor() {
    super(
      { message: 'File not found', error: 'ResourceNotFoundException' },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * An imported ZIP tries to inflate past our decompression budget (a zip bomb) —
 * too many entries, or a single/total uncompressed size beyond the cap. The
 * multipart limit only bounds the *compressed* upload, so this is the guard that
 * stops a small archive from exhausting the heap on extraction. 413.
 */
export class MaliciousArchiveException extends HttpException {
  constructor(reason: string) {
    super(
      { message: `Rejected archive: ${reason}`, error: 'MaliciousArchiveException' },
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}
