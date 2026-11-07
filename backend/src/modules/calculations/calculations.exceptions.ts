import { HttpException, HttpStatus } from '@nestjs/common';
import { Calculation } from '../../engine/engine.types';

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

/** A save with an invalid calculation stores nothing, and a set with errors can't be tested or computed; `calculations` has the errors. */
export class InvalidCalculationsException extends HttpException {
  constructor(calculations: Calculation[]) {
    super(
      {
        message: 'Some calculations are invalid',
        error: 'InvalidCalculationsException',
        calculations,
      },
      HttpStatus.BAD_REQUEST,
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
