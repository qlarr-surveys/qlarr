import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * An engine op ran past its time budget and its worker was terminated (typically
 * a survey design with a runaway/looping expression). 503 so clients can retry;
 * the request is shed rather than allowed to block the server.
 */
export class EngineTimeoutException extends HttpException {
  constructor() {
    super(
      { message: null, error: 'EngineTimeoutException' },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/**
 * change-code failures (all rendered as 400 with a null message and
 * the class name as `error`).
 */
class ChangeCodeException extends HttpException {
  constructor(error: string) {
    super({ message: null, error }, HttpStatus.BAD_REQUEST);
  }
}

export class IdenticalFromToCodesException extends ChangeCodeException {
  constructor() {
    super('IdenticalFromToCodesException');
  }
}

export class FromCodeNotAvailableException extends ChangeCodeException {
  constructor() {
    super('FromCodeNotAvailableException');
  }
}

export class DuplicateToCodeException extends ChangeCodeException {
  constructor() {
    super('DuplicateToCodeException');
  }
}

export class InvalidCodeChangeException extends ChangeCodeException {
  constructor() {
    super('InvalidCodeChangeException');
  }
}
