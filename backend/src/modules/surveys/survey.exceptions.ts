import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Survey domain exceptions. Each renders a `{ message, error }` body (where
 * `error` is the exception's class name) with a status matching the legacy
 * exception handler — so API responses stay consistent until the shared global
 * exception filter (plan §8) lands.
 */
class SurveyException extends HttpException {
  constructor(message: string, error: string, status: HttpStatus) {
    super({ message, error }, status);
  }
}

export class SurveyNotFoundException extends SurveyException {
  constructor() {
    super('Survey not found', 'SurveyNotFoundException', HttpStatus.NOT_FOUND);
  }
}

export class InvalidSurveyName extends SurveyException {
  constructor() {
    super('Invalid survey name', 'InvalidSurveyName', HttpStatus.BAD_REQUEST);
  }
}

export class InvalidSurveyDates extends SurveyException {
  constructor() {
    super('Invalid survey dates', 'InvalidSurveyDates', HttpStatus.BAD_REQUEST);
  }
}

export class SurveyIsClosedException extends SurveyException {
  constructor() {
    super(
      'Should not modify a closed Survey',
      'SurveyIsClosedException',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class SurveyIsActiveException extends SurveyException {
  constructor() {
    super(
      'Survey has active status',
      'SurveyIsActiveException',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class SurveyIsNotActiveException extends SurveyException {
  constructor() {
    super(
      'This survey should be active',
      'SurveyIsNotActiveException',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class DuplicateSurveyException extends SurveyException {
  constructor() {
    super('Duplicate survey', 'DuplicateSurveyException', HttpStatus.BAD_REQUEST);
  }
}

export class SurveyDefNotAvailableException extends SurveyException {
  constructor() {
    super(
      'Survey Definition file is missing',
      'SurveyDefNotAvailableException',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class DesignNotAvailableException extends SurveyException {
  constructor() {
    super(
      'Design file is missing',
      'DesignNotAvailableException',
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * An uploaded autocomplete file that isn't a non-empty JSON array of strings.
 * Renders a null message with the class name as `error`, at 400.
 */
export class AutoCompleteMalformedInputException extends HttpException {
  constructor() {
    super(
      { message: null, error: 'AutoCompleteMalformedInputException' },
      HttpStatus.BAD_REQUEST,
    );
  }
}
