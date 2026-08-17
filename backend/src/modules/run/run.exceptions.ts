import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Run-flow error → an HTTP status with a message and the class name as `error`.
 * Defaults to 400; the survey-availability errors override it to 404.
 */
class RunException extends HttpException {
  constructor(
    message: string,
    error: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ message, error }, status);
  }
}

/** The design has validation errors and can't be run (≈ engine
 *  `SurveyDesignWithErrorException`). 400. */
export class SurveyDesignWithErrorException extends RunException {
  constructor() {
    super('Survey Design with Error', 'SurveyDesignWithErrorException');
  }
}

export class ResumeNotAllowedException extends RunException {
  constructor() {
    super('This Navigation Direction is not allowed', 'ResumeNotAllowed');
  }
}

export class JumpNotAllowedException extends RunException {
  constructor() {
    super('This Navigation Direction is not allowed', 'JumpNotAllowed');
  }
}

export class PreviousNotAllowedException extends RunException {
  constructor() {
    super('This Navigation Direction is not allowed', 'PreviousNotAllowed');
  }
}

export class SurveyNotStartedException extends RunException {
  constructor(startDate: string) {
    super(
      `This survey has not started yet, it starts on ${startDate}`,
      'SurveyNotStartedException',
      HttpStatus.NOT_FOUND,
    );
  }
}

export class SurveyExpiredException extends RunException {
  constructor() {
    super(
      'Invalid input, survey end date must always be before start date',
      'SurveyExpiredException',
      HttpStatus.NOT_FOUND,
    );
  }
}

export class SurveyQuotaExceededException extends RunException {
  constructor() {
    super('Survey Quota Exceeded', 'SurveyQuotaExceeded', HttpStatus.NOT_FOUND);
  }
}

export class ClientTimeSkewException extends RunException {
  constructor() {
    super('Client time is out of sync with the server', 'ClientTimeSkewException');
  }
}
