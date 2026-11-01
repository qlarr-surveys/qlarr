import { randomBytes } from 'node:crypto';
import { LoggedInUserResponse } from './access.dto';
import { UserDTO } from './user.dto';
import { UserEntity } from './user.entity';
import { rolesFromDb } from './user-roles';

/** ≈ UserMapper.mapToDto — roles lowercased to the API form. */
export function userToDto(e: UserEntity): UserDTO {
  return {
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    isConfirmed: e.isConfirmed,
    roles: rolesFromDb(e.roles),
  };
}

/** ≈ UserMapper.mapToUserResponse — the logged-in payload (id + lowercase roles). */
export function loggedInResponse(
  e: UserEntity,
  accessToken: string,
  refreshTokenId?: string,
): LoggedInUserResponse {
  return {
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    accessToken,
    ...(refreshTokenId && { refreshToken: refreshTokenId }),
    email: e.email,
    roles: rolesFromDb(e.roles),
  };
}

/**
 * The placeholder password for invited users: nobody knows it, the invitee sets
 * a real one through the invitation link.
 */
export const randomPassword = (): string => randomBytes(32).toString('base64url');
