import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './role.enum';
import { ROLES_KEY } from './roles.decorator';

/**
 * Global authorization guard. Runs after JwtAuthGuard (so req.user is set).
 * A route with no @Roles() is unrestricted; otherwise the caller must hold at
 * least one required role (matches Spring's hasAnyAuthority).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const authorities: string[] = user?.authorities ?? [];
    if (!required.some((role) => authorities.includes(role))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
