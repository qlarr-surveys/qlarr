import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DbContext } from '../../database/db-context';
import { RefreshTokenEntity } from './refresh-token.entity';

/**
 * Data-access for the `refresh_tokens` table. Shared by AccessService
 * (refresh lookup + logout invalidation) and UsersService (invalidation on
 * password/email change).
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

  async deleteByUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
