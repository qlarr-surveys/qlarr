import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** ≈ UserDTO. `roles` are lowercase API form. */
export interface UserDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isConfirmed: boolean;
  roles: string[];
}

// Request DTOs (classes → validated + whitelisted by the global pipe). Structure
// only; the service keeps the semantic checks (name length via isValidName,
// email format, role membership, emptiness) and their domain exceptions.

/** ≈ CreateRequest. `roles` arrive lowercase. */
export class CreateRequest {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsString() @IsNotEmpty() email: string;
  @IsArray() @IsString({ each: true }) roles: string[];
}

/** ≈ EditUserRequest (super_admin edits another user). */
export class EditUserRequest {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) roles?: string[];
}

/** ≈ EditProfileRequest (a user edits their own profile). */
export class EditProfileRequest {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() newPassword?: string;
}

/** ≈ ConfirmEmailRequest (email-change PIN confirmation). */
export class ConfirmEmailRequest {
  @IsString() @IsNotEmpty() pin: string;
}

/** ≈ CountByRoleResponse. */
export interface CountByRoleResponse {
  superAdmin: number;
  surveyAdmin: number;
  surveyor: number;
}
