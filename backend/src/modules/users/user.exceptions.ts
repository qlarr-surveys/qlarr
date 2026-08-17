import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * User/auth domain exceptions. Each renders the `{ message, error }` body
 * (error = class name) at the documented status. See survey.exceptions.ts for
 * the same bridge pattern (until the shared global filter, plan §8, lands).
 */
class UserException extends HttpException {
  constructor(message: string, error: string, status: HttpStatus) {
    super({ message, error }, status);
  }
}

export class UserNotFoundException extends UserException {
  constructor() {
    super('User not found', 'UserNotFoundException', HttpStatus.NOT_FOUND);
  }
}

export class EditOwnUserException extends UserException {
  constructor() {
    super('Cannot edit your own user', 'EditOwnUserException', HttpStatus.BAD_REQUEST);
  }
}

export class DeleteOwnUserException extends UserException {
  constructor() {
    super(
      'Cannot delete your own user',
      'DeleteOwnUserException',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class EmptyRolesException extends UserException {
  constructor() {
    super('Roles cannot be empty', 'EmptyRolesException', HttpStatus.BAD_REQUEST);
  }
}

export class InvalidFirstName extends UserException {
  constructor() {
    super('Invalid first name', 'InvalidFirstName', HttpStatus.BAD_REQUEST);
  }
}

export class InvalidLastName extends UserException {
  constructor() {
    super('Invalid last name', 'InvalidLastName', HttpStatus.BAD_REQUEST);
  }
}

export class InvalidEmail extends UserException {
  constructor() {
    super('Invalid Email', 'InvalidEmail', HttpStatus.BAD_REQUEST);
  }
}

export class DuplicateEmailException extends UserException {
  constructor() {
    super(
      'Invalid input, duplicate email',
      'DuplicateEmailException',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class WrongCredentialsException extends UserException {
  constructor() {
    super(
      'Wrong email or password',
      'WrongCredentialsException',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class WrongEmailChangePinException extends UserException {
  constructor() {
    super(
      'Wrong email change pin',
      'WrongEmailChangePinException',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class AuthorizationException extends UserException {
  constructor() {
    super('unauthorized', 'AuthorizationException', HttpStatus.UNAUTHORIZED);
  }
}

// The same message is rendered for wrong-reset and wrong-confirmation.
const WRONG_TOKEN_MESSAGE =
  'This confirmation token is either wrong or has been already used';

export class WrongResetTokenException extends UserException {
  constructor() {
    super(WRONG_TOKEN_MESSAGE, 'WrongResetTokenException', HttpStatus.UNAUTHORIZED);
  }
}

export class ExpiredResetTokenException extends UserException {
  constructor() {
    super(
      'This reset token has expired',
      'ExpiredResetTokenException',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class WrongConfirmationTokenException extends UserException {
  constructor() {
    super(
      WRONG_TOKEN_MESSAGE,
      'WrongConfirmationTokenException',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class ExpiredConfirmationTokenException extends UserException {
  constructor() {
    super(
      'This confirmation token has expired',
      'ExpiredConfirmationTokenException',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class GoogleAuthError extends UserException {
  constructor() {
    super(
      'Could not process google credentials',
      'GoogleAuthError',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
