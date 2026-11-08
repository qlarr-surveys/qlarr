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
