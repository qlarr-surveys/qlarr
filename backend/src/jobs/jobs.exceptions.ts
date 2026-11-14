import { HttpException, HttpStatus } from '@nestjs/common';

/** Renders a `{ message, error }` body, like the other domain exceptions. */
class JobsException extends HttpException {
  constructor(message: string, error: string, status: HttpStatus) {
    super({ message, error }, status);
  }
}

/** A job is already queued or running on the same subject. */
export class JobAlreadyActiveException extends JobsException {
  constructor() {
    super('A job is already in progress', 'JobAlreadyActiveException', HttpStatus.CONFLICT);
  }
}

export class JobNotFoundException extends JobsException {
  constructor() {
    super('Job not found', 'JobNotFoundException', HttpStatus.NOT_FOUND);
  }
}

/** A retry on a subject with no failed responses. */
export class NoFailuresException extends JobsException {
  constructor() {
    super('No failed responses to retry', 'NoFailuresException', HttpStatus.CONFLICT);
  }
}

/** A kind no handler is registered for. */
export class JobKindNotFoundException extends JobsException {
  constructor() {
    super('Job kind not found', 'JobKindNotFoundException', HttpStatus.NOT_FOUND);
  }
}
