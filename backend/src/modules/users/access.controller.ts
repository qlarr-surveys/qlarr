import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../auth/public.decorator';
import { IdentityThrottlerGuard } from '../../auth/identity-throttler.guard';
import { AccessService } from './access.service';
import {
  ForgotPasswordRequest,
  LoginRequest,
  RefreshRequest,
  ResetPasswordRequest,
} from './access.dto';
import { UsersService } from './users.service';

@Controller('user')
export class AccessController {
  constructor(
    private readonly access: AccessService,
    private readonly users: UsersService,
  ) {}

  // Brute-force brake: 10 attempts / 5 min per email (see IdentityThrottlerGuard).
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @UseGuards(IdentityThrottlerGuard)
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginRequest) {
    return this.access.login(body.email, body.password);
  }

  @Public()
  @Post('refresh_token')
  @HttpCode(200)
  refreshToken(@Body() body: RefreshRequest) {
    return this.access.refresh(body.accessToken, body.refreshToken);
  }

  // Cap reset-email sends per address: 5 / 15 min (throttle even before the
  // tenant/user is known, so an unknown email can't be used to email-bomb).
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @UseGuards(IdentityThrottlerGuard)
  @Public()
  @Post('forgot_password')
  @HttpCode(204)
  async forgotPassword(@Body() body: ForgotPasswordRequest): Promise<void> {
    await this.users.forgotPassword(body);
  }

  @Public()
  @Post('reset_password')
  @HttpCode(200)
  resetPassword(@Body() body: ResetPasswordRequest) {
    return this.users.resetPassword(body);
  }
}
