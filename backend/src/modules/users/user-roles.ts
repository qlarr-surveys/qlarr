import { Role } from '../../auth/role.enum';

/**
 * Roles cross the same case boundary as survey status/usage: the `users.roles`
 * varchar[] stores the enum NAME (uppercase, e.g. `SUPER_ADMIN`), while
 * the JSON API speaks the lowercase wire form (`super_admin`). JWT
 * `authorities` are already lowercase (see role.enum.ts / TokenService).
 */
const API_ROLES: readonly string[] = Object.values(Role);

export const isValidRole = (r: string): boolean =>
  API_ROLES.includes(r.toLowerCase());

/** API (lowercase) → DB (uppercase enum name). */
export const roleToDb = (r: string): string => r.toUpperCase();
/** DB (uppercase enum name) → API (lowercase). */
export const roleFromDb = (r: string): string => r.toLowerCase();

export const rolesToDb = (roles: string[]): string[] => roles.map(roleToDb);
export const rolesFromDb = (roles: string[]): string[] => roles.map(roleFromDb);
