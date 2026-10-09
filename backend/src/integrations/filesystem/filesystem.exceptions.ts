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
 * A storage path segment (surveyId / responseId / filename) that is not one
 * plain name — empty, `.`/`..`, or carrying `/`, `\` or NUL — so it could
 * address a file outside its own `{surveyId}/{folder}/` directory. Express
 * URL-decodes route params, so an encoded `..%2F..%2Fother%2Fdesign%2F1` arrives
 * as a real traversal. 400.
 */
export class InvalidFilePathException extends HttpException {
  constructor() {
    super(
      { message: 'Invalid file path', error: 'InvalidFilePathException' },
      HttpStatus.BAD_REQUEST,
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
