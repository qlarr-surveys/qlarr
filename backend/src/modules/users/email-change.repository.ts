import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DbContext } from '../../database/db-context';
import { EmailChangeEntity } from './email-change.entity';

/**
 * Data-access for the `email_changes` table (one pending email change +
 * PIN per user). Resolves the repository per call from the request-scoped
 * manager.
 */
@Injectable()
export class EmailChangeRepository {
  constructor(private readonly db: DbContext) {}

  private get repo(): Repository<EmailChangeEntity> {
    return this.db.manager.getRepository(EmailChangeEntity);
  }

  /** Upsert the pending change for a user (PK = user_id). */
  save(change: {
    userId: string;
    newEmail: string;
    pin: string;
  }): Promise<EmailChangeEntity> {
    return this.repo.save(change);
  }

  findByUser(userId: string): Promise<EmailChangeEntity | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
