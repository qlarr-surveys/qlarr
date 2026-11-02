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
 * An engine op threw. Kotlin/JS exceptions aren't real JS `Error`s, so crossing
 * the worker boundary (structured clone) reduces them to a plain
 * `{ name, message, cause }` object with no stack. This wraps that object so it
 * is logged with the engine's name and message. Not an `HttpException`: it
 * still renders as a generic 500, with `EngineException` as the `error`.
 */
export class EngineException extends Error {
  constructor(op: string, engineError: unknown) {
    const { name, message, stack } = (engineError ?? {}) as {
      name?: unknown;
      message?: unknown;
      stack?: unknown;
    };
    super(
      `Engine op '${op}' failed: ${String(name ?? 'Error')}: ${String(message ?? engineError)}`,
      { cause: engineError },
    );
    this.name = 'EngineException';
    // The worker-side stack, when the clone kept one, is the only trace of
    // where the failure happened inside the engine.
    if (typeof stack === 'string') {
      this.stack = `${this.stack}\nWorker stack:\n${stack}`;
    }
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
