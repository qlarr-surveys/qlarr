import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { CurrentUserPrincipal } from './jwt.types';

@Controller('auth')
export class AuthController {
  /**
   * Protected by the global JwtAuthGuard. Phase 0 proof that a minted token
   * is accepted and its claims decode into the principal.
   */
  @Get('me')
  me(@CurrentUser() user: CurrentUserPrincipal) {
    return user;
  }
}
