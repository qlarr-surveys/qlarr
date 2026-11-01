import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { WrongCredentialsException } from './user.exceptions';
import * as bcrypt from 'bcryptjs';
import { CurrentUserPrincipal } from '../../auth/jwt.types';
import { LoginIssuer } from '../../auth/login-issuer';
import { TokenService } from '../../auth/token.service';
import { DbContext } from '../../database/db-context';
import { wallClockToInstant } from '../../common/datetime';
import { UUID_RE } from '../../common/validation';
import { JwtConfig } from '../../config/jwt.config';
import { LoggedInUserResponse } from './access.dto';
import { RefreshTokenEntity } from './refresh-token.entity';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UserRepository } from './user.repository';

/**
 * How long a just-rotated refresh token still works. Covers two tabs refreshing
 * at the same moment (both read the old token from the shared cookie).
 */
const ROTATION_GRACE_MS = 30_000;

@Injectable()
export class AccessService {
  constructor(
    private readonly db: DbContext,
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenService,
    private readonly issuer: LoginIssuer,
    private readonly config: ConfigService,
  ) {}

  /**
   * Public login: credential check + token issuance. An unknown email gives the
   * same uniform 401 as a bad password, so nothing leaks which failed. An
   * invited user who hasn't accepted yet has only a placeholder password, so
   * they can't log in until they set one through the invitation link.
   */
  async login(email: string, password: string): Promise<LoggedInUserResponse> {
    const user = await this.users.findByEmailWithPassword(
      email.trim().toLowerCase(),
    );
    if (
      !user ||
      !user.isConfirmed ||
      !(await bcrypt.compare(password, user.password))
    ) {
      throw new WrongCredentialsException();
    }

    return this.issuer.issue(this.db.manager, user);
  }

  /**
   * Refresh with rotation. The access token (expired is fine) must be genuine
   * and name the session's user; the session must be within its hard cap and
   * idle timeout. Outcomes by which token was presented:
   *  - the session's current token → swapped for a new one, returned with a new
   *    access token;
   *  - its previous token, within ROTATION_GRACE_MS of the swap → a new access
   *    token only, no refresh token and no second rotation, so a concurrent tab
   *    stays logged in and its late response can't overwrite the newer token;
   *  - its previous token after that → treated as a stolen token being
   *    replayed: the session is deleted.
   */
  async refresh(
    accessToken: string,
    refreshTokenId: string,
  ): Promise<LoggedInUserResponse> {
    const invalid = () =>
      new UnauthorizedException('Invalid or expired token, please reconnect');

    const details = this.tokens.decodeExpired(accessToken);
    if (!details || !UUID_RE.test(refreshTokenId)) throw invalid();

    const current = await this.refreshTokens.findById(refreshTokenId);
    if (current) {
      if (current.userId !== details.userId || !this.isLive(current)) {
        throw invalid();
      }
      const user = await this.users.findById(current.userId);
      if (!user) throw invalid();
      const nextId = randomUUID();
      if (await this.refreshTokens.rotate(current.id, nextId)) {
        return this.issuer.reissue(this.db.manager, user, nextId);
      }
      // A concurrent refresh of the same token rotated it first — fall
      // through and serve this one from the grace window.
    }

    const rotated = await this.refreshTokens.findByPreviousId(refreshTokenId);
    if (!rotated || rotated.userId !== details.userId) throw invalid();
    if (Date.now() - wallClockToInstant(rotated.lastUsedAt) > ROTATION_GRACE_MS) {
      await this.refreshTokens.deleteById(rotated.id);
      throw invalid();
    }
    if (!this.isLive(rotated)) throw invalid();
    const user = await this.users.findById(rotated.userId);
    if (!user) throw invalid();
    return this.issuer.reissue(this.db.manager, user);
  }

  /** Within the session's hard cap and idle timeout. */
  private isLive(session: RefreshTokenEntity): boolean {
    const { refreshIdleMs } = this.config.getOrThrow<JwtConfig>('jwt');
    const now = Date.now();
    // Both columns are UTC wall clocks; parse them as UTC to compare to now.
    return (
      wallClockToInstant(session.expiration) > now &&
      wallClockToInstant(session.lastUsedAt) + refreshIdleMs > now
    );
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
