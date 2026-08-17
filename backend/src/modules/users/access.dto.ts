import { IsNotEmpty, IsString } from 'class-validator';

// Request DTOs are classes so the global ValidationPipe can enforce their
// structure (presence + type) at runtime and strip unknown properties. Semantic
// checks (email format, password strength, …) stay in the services with their
// domain-specific exceptions.

export class LoginRequest {
  @IsString() @IsNotEmpty() email: string;
  @IsString() @IsNotEmpty() password: string;
}

export class RefreshRequest {
  @IsString() @IsNotEmpty() accessToken: string;
  @IsString() @IsNotEmpty() refreshToken: string;
}

export class ForgotPasswordRequest {
  @IsString() @IsNotEmpty() email: string;
}

/** `refreshToken` is the reset JWT (that is the field name). */
export class ResetPasswordRequest {
  @IsString() @IsNotEmpty() refreshToken: string;
  @IsString() @IsNotEmpty() newPassword: string;
}

export interface LoggedInUserResponse {
  id: string;
  firstName: string;
  lastName: string;
  accessToken: string;
  refreshToken: string;
  email: string;
  roles: string[]; // lowercase API form (the wire contract)
}
