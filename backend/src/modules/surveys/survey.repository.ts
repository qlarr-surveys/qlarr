import { Injectable } from '@nestjs/common';
import { DeepPartial, Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/db-errors';
import { DbContext } from '../../database/db-context';
import { SurveyEntity } from './survey.entity';
import { DuplicateSurveyException } from './survey.exceptions';

/**
 * Data-access for the `surveys` table. Resolves the repository per call
 * from the request-scoped manager. The unique-name collision is mapped to a typed
 * DuplicateSurveyException here, so the service never sees a raw Postgres error.
 * (Version rows live in VersionRepository; autocomplete in AutoCompleteRepository.)
 */
@Injectable()
export class SurveyRepository {
  constructor(private readonly db: DbContext) {}

  private get repo(): Repository<SurveyEntity> {
    return this.db.manager.getRepository(SurveyEntity);
  }

  findById(id: string): Promise<SurveyEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Build an unsaved SurveyEntity instance. */
  create(data: DeepPartial<SurveyEntity>): SurveyEntity {
    return this.repo.create(data);
  }

  /** Persist a survey; maps the unique-name collision to a typed error. */
  async save(entity: SurveyEntity): Promise<SurveyEntity> {
    try {
      return await this.repo.save(entity);
    } catch (err) {
      if (isUniqueViolation(err)) throw new DuplicateSurveyException();
      throw err;
    }
  }

  /** Every survey name (for unique-name generation). */
  async allNames(): Promise<string[]> {
    const rows: Array<{ name: string }> = await this.db.manager.query(
      'SELECT name FROM surveys',
    );
    return rows.map((r) => r.name);
  }

  /**
   * Delete a survey and its FK-referencing rows (responses, versions) in one
   * transaction — the children must go before the survey row.
   */
  async deleteCascade(id: string): Promise<void> {
    await this.db.manager.transaction(async (tx) => {
      await tx.query('DELETE FROM responses WHERE survey_id = $1', [id]);
      await tx.query('DELETE FROM versions WHERE survey_id = $1', [id]);
      await tx.query('DELETE FROM surveys WHERE id = $1', [id]);
    });
  }
}
