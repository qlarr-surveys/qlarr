import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CurrentUserPrincipal } from '../../auth/jwt.types';
import { LoginIssuer } from '../../auth/login-issuer';
import { TokenService } from '../../auth/token.service';
import { DbContext } from '../../database/db-context';
import { wallClockToInstant } from '../../common/datetime';
import { UUID_RE } from '../../common/validation';
import { LoggedInUserResponse } from './access.dto';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UserRepository } from './user.repository';

@Injectable()
export class AccessService {
  constructor(
    private readonly db: DbContext,
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenService,
    private readonly issuer: LoginIssuer,
  ) {}

  /**
   * Public login: credential check + token issuance. An unknown email gives the
   * same uniform 401 as a bad password, so nothing leaks which failed.
   */
  async login(email: string, password: string): Promise<LoggedInUserResponse> {
    const user = await this.users.findByEmailWithPassword(
      email.trim().toLowerCase(),
    );
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Wrong credentials');
    }

    return this.issuer.issue(this.db.manager, user);
  }

  /**
   * Refresh. Validates the stored refresh token belongs to the (expired) access
   * token's user and hasn't expired, then issues a NEW access token while reusing
   * the SAME refresh token (no rotation).
   */
  async refresh(
    accessToken: string,
    refreshTokenId: string,
  ): Promise<LoggedInUserResponse> {
    const invalid = () =>
      new UnauthorizedException('Invalid or expired token, please reconnect');

    const details = this.tokens.decodeExpired(accessToken);
    if (!details || !UUID_RE.test(refreshTokenId)) throw invalid();

    const stored = await this.refreshTokens.findById(refreshTokenId);
    if (
      !stored ||
      stored.userId !== details.userId ||
      // `expiration` is a UTC wall clock; parse it as UTC to compare to now.
      wallClockToInstant(stored.expiration) <= Date.now()
    ) {
      throw invalid();
    }

    const user = await this.users.findById(stored.userId);
    if (!user) throw invalid();

    // Reuse the same refresh token (no rotation).
    return this.issuer.issue(this.db.manager, user, stored.id);
  }

  /**
   * Logout. The access token is stateless and simply expires; ending the session
   * means invalidating the refresh token so no held refresh token can mint fresh
   * access tokens. Drops EVERY refresh token for the user ("log out everywhere")
   * — session-scoped invalidation can't be trusted because a refreshed access
   * token carries a new session_id that no longer matches its stored row. Same
   * policy as password/email change. Idempotent: deleting absent rows is a
   * no-op, so a repeated logout still succeeds.
   */
  async logout(principal: CurrentUserPrincipal): Promise<void> {
    await this.refreshTokens.deleteByUser(principal.userId);
  }
}
