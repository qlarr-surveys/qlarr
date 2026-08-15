import { SetMetadata } from '@nestjs/common';
import { Role } from './role.enum';

export const ROLES_KEY = 'roles';

/** Require the caller to hold at least one of the given roles (≈ hasAnyAuthority). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
