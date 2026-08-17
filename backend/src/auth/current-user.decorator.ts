import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserPrincipal } from './jwt.types';

/** Injects the decoded JWT principal into a handler param. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPrincipal => {
    return ctx.switchToHttp().getRequest().user;
  },
);
