import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { formatWallClockUtc, nowUtcString } from '../common/datetime';
import { JwtConfig } from '../config/jwt.config';
import { LoggedInUserResponse } from '../modules/users/access.dto';
import { RefreshTokenEntity } from '../modules/users/refresh-token.entity';
import { UserEntity } from '../modules/users/user.entity';
import { loggedInResponse } from '../modules/users/user.mapper';
import { TokenService } from './token.service';

/**
 * The single source of truth for "issue a logged-in response" — the shape
 * shared by login, refresh, reset-password and email-change confirm.
 */
@Injectable()
export class LoginIssuer {
  constructor(
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  /**
   * A fresh login: inserts a new session row and stamps `lastLogin`.
   */
  async issue(
    manager: EntityManager,
    user: UserEntity,
  ): Promise<LoggedInUserResponse> {
    await this.deleteDeadSessions(manager, user.id);
    const issued = this.generateAccessToken(user);
    const refreshId = randomUUID();
    await manager.getRepository(RefreshTokenEntity).insert({
      id: refreshId,
      userId: user.id,
      expiration: issued.refreshTokenExpiry,
      sessionId: issued.sessionId,
      previousId: null,
      lastUsedAt: nowUtcString(),
    });
    await manager
      .getRepository(UserEntity)
      .update({ id: user.id }, { lastLogin: nowUtcString() });
    return loggedInResponse(user, issued.token, refreshId);
  }

  /**
   * The refresh flow, after AccessService has handled the session's row: a new
   * access token, with `refreshId` when the token was just rotated, or no
   * refresh token at all for a grace-window refresh (so a late response can't
   * overwrite a newer token the client already holds).
   */
  async reissue(
    manager: EntityManager,
    user: UserEntity,
    refreshId?: string,
  ): Promise<LoggedInUserResponse> {
    await this.deleteDeadSessions(manager, user.id);
    return loggedInResponse(user, this.generateAccessToken(user).token, refreshId);
  }

  private generateAccessToken(user: UserEntity) {
    return this.tokens.generateAccessToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });
  }

  /**
   * Keeps `refresh_tokens` bounded without a scheduler: every login/refresh
   * drops the user's sessions that are past their hard cap or idle timeout.
   */
  private async deleteDeadSessions(
    manager: EntityManager,
    userId: string,
  ): Promise<void> {
    const cfg = this.config.getOrThrow<JwtConfig>('jwt');
    await manager
      .createQueryBuilder()
      .delete()
      .from(RefreshTokenEntity)
      .where('user_id = :userId', { userId })
      .andWhere('(expiration <= :now OR last_used_at <= :idleCutoff)', {
        now: nowUtcString(),
        idleCutoff: formatWallClockUtc(new Date(Date.now() - cfg.refreshIdleMs)),
      })
      .execute();
  }
}
