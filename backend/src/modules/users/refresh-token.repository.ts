import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { nowUtcString } from '../../common/datetime';
import { DbContext } from '../../database/db-context';
import { RefreshTokenEntity } from './refresh-token.entity';

/**
 * Data-access for the `refresh_tokens` table. Shared by AccessService
 * (refresh lookup/rotation + logout invalidation) and UsersService
 * (invalidation on password/email change and user deletion).
 * Resolves the repository per call from the request-scoped manager.
 * (Token issuance goes through LoginIssuer, which writes via an explicit manager
 * so it also works during signup/provisioning.)
 */
@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly db: DbContext) {}

  private get repo(): Repository<RefreshTokenEntity> {
    return this.db.manager.getRepository(RefreshTokenEntity);
  }

  findById(id: string): Promise<RefreshTokenEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByPreviousId(id: string): Promise<RefreshTokenEntity | null> {
    return this.repo.findOne({ where: { previousId: id } });
  }

  /**
   * Swaps the session's token from `currentId` to `nextId`. Conditional on the
   * row still holding `currentId`, so of two concurrent rotations of the same
   * token only one wins; returns false for the loser.
   */
  async rotate(currentId: string, nextId: string): Promise<boolean> {
    const result = await this.repo.update(
      { id: currentId },
      { id: nextId, previousId: currentId, lastUsedAt: nowUtcString() },
    );
    return result.affected === 1;
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
