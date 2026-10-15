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

/** Save, Test and Compute are all refused while a Compute run is in progress. */
export class CalculationRunInProgressException extends CalculationsException {
  constructor() {
    super(
      'A computation is in progress',
      'CalculationRunInProgressException',
      HttpStatus.CONFLICT,
    );
  }
}

/** Test and Compute need a saved set with at least one calculation. */
export class NoCalculationsException extends CalculationsException {
  constructor() {
    super(
      'There are no calculations to compute',
      'NoCalculationsException',
      HttpStatus.BAD_REQUEST,
    );
  }
}
