import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Missing response. Renders `{ message: "Response not found", error }` with 400
 * (400 — not 404 — for this one).
 */
export class ResponseNotFoundException extends HttpException {
  constructor() {
    super(
      { message: 'Response not found', error: 'ResponseNotFoundException' },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** An uploaded file exceeds the per-type cap. 413. */
export class FileTooBigException extends HttpException {
  constructor(actualSize: number, maxSize: number, mimeType: string) {
    const mb = (n: number) => Math.floor(n / 1024 / 1024);
    super(
      {
        message: `File too large: ${mb(actualSize)} MB. Maximum allowed for ${mimeType} is ${mb(maxSize)} MB.`,
        error: 'FileTooBigException',
      },
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}

/** Bulk file export exceeds the 200MB cap. 413. */
export class SizeLimitExceededException extends HttpException {
  constructor() {
    super(
      { message: 'Bulk Download size is too big!!!', error: 'SizeLimitExceededException' },
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}

/** The question id has no stored file value. 400. */
export class InvalidQuestionId extends HttpException {
  constructor() {
    super(
      { message: 'Invalid question id', error: 'InvalidQuestionId' },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * A submitted response value whose runtime type doesn't match the design's
 * schema. 400.
 */
export class WrongValueTypeException extends HttpException {
  constructor(columnName: string, expectedType: string, actualType: string) {
    super(
      {
        message: `Wrong value type for ${columnName}, expected ${expectedType} found ${actualType}`,
        error: 'WrongValueType',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** A response with this id was already synced. 400. */
export class ResponseAlreadySyncedException extends HttpException {
  constructor() {
    super(
      { message: 'Response already synced', error: 'ResponseAlreadySyncedException' },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** An offline response synced before reaching its end. 400. */
export class IncompleteResponse extends HttpException {
  constructor() {
    super(
      {
        message: 'Incomplete Response, Responses must be at End to be synced',
        error: 'IncompleteResponse',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** An offline response that fails engine validation. 400. */
export class InvalidResponse extends HttpException {
  constructor() {
    super(
      {
        message: 'Invalid Response, Responses must be at End to be synced',
        error: 'InvalidResponse',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
