import { Controller, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { CurrentUserPrincipal } from '../../auth/jwt.types';
import { AccessService } from './access.service';

/**
 * Root-level `POST /logout`. Authenticated, so the
 * tenant is pinned from the caller's JWT and the session to drop is read from
 * its session_id claim — no request body. Returns 200 with no content; the
 * frontend (AuthService.logout) clears its local session only on a 200.
 */
@Controller()
export class LogoutController {
  constructor(private readonly access: AccessService) {}

  @Post('logout')
  @HttpCode(200)
  logout(@CurrentUser() user: CurrentUserPrincipal): Promise<void> {
    return this.access.logout(user);
  }
}
