import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { nowUtcString } from '../common/datetime';
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
  constructor(private readonly tokens: TokenService) {}

  /**
   * @param existingRefreshId when provided, that refresh token is reused (no
   *   rotation, no `lastLogin` bump) — the refresh-token flow. Otherwise a new
   *   refresh row is inserted and `lastLogin` is stamped — every fresh login.
   */
  async issue(
    manager: EntityManager,
    user: UserEntity,
    existingRefreshId?: string,
  ): Promise<LoggedInUserResponse> {
    const issued = this.tokens.generateAccessToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });
    if (existingRefreshId) {
      return loggedInResponse(user, issued.token, existingRefreshId);
    }
    const refreshId = randomUUID();
    await manager.getRepository(RefreshTokenEntity).insert({
      id: refreshId,
      userId: user.id,
      expiration: issued.refreshTokenExpiry,
      sessionId: issued.sessionId,
    });
    await manager
      .getRepository(UserEntity)
      .update({ id: user.id }, { lastLogin: nowUtcString() });
    return loggedInResponse(user, issued.token, refreshId);
  }
}
