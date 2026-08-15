import { HttpException, HttpStatus } from '@nestjs/common';

/** Internal design inconsistency. 400. */
export class DesignException extends HttpException {
  constructor() {
    super(
      { message: 'Major issue, contact design', error: 'DesignException' },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** A published version failed validation. 400. */
export class InvalidDesignException extends HttpException {
  constructor() {
    super(
      { message: 'Major issue, contact design', error: 'InvalidDesignException' },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** The client edited from a stale sub-version. 400. */
export class DesignOutOfSyncException extends HttpException {
  constructor(subVersion: number) {
    super(
      {
        message: `can only update from latest subVersion: ${subVersion}`,
        error: 'DesignOutOfSyncException',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * No published version to offline-sync against. It has no dedicated handler, so
 * it falls through to the generic 500.
 */
export class NoPublishedVersionException extends HttpException {
  constructor() {
    super(
      { message: 'Unexpected error', error: 'NoPublishedVersionException' },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
