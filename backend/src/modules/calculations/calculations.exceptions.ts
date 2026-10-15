import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Calculation domain exceptions. Each renders a `{ message, error }` body (where
 * `error` is the exception's class name), like the other domain exceptions.
 */
class CalculationsException extends HttpException {
  constructor(message: string, error: string, status: HttpStatus) {
    super({ message, error }, status);
  }
}

/** A save sent a revision that is no longer current: someone else saved first. */
export class CalculationsRevisionConflictException extends CalculationsException {
  constructor() {
    super(
      'The calculations were changed by someone else',
      'CalculationsRevisionConflictException',
      HttpStatus.CONFLICT,
    );
  }
}
