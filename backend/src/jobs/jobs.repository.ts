import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { DbContext } from '../database/db-context';
import { BOSS_SCHEMA } from './jobs.constants';

/** A job's progress, from its row in `jobs`. */
export interface JobProgress {
  done: number;
  total: number;
}

/**
 * Data access for `jobs`, our side of each pg-boss job: its survey (the row
 * goes with it, FK cascade) and progress. Kind and subject stay in pg-boss.
 */
@Injectable()
export class JobsRepository {
  constructor(private readonly db: DbContext) {}

  async insert(tx: EntityManager, id: string, surveyId: string): Promise<void> {
    await tx.query('INSERT INTO jobs (id, survey_id) VALUES ($1, $2)', [id, surveyId]);
  }

  async progress(id: string): Promise<JobProgress | null> {
    const rows: JobProgress[] = await this.db.manager.query(
      'SELECT progress_done AS done, progress_total AS total FROM jobs WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  }

  async idsOfSurvey(tx: EntityManager, surveyId: string): Promise<string[]> {
    const rows: Array<{ id: string }> = await tx.query(
      'SELECT id FROM jobs WHERE survey_id = $1',
      [surveyId],
    );
    return rows.map((r) => r.id);
  }

  /** The id of the newest pg-boss job of `kind` on `singletonKey`, if any. */
  async latestId(m: EntityManager, kind: string, singletonKey: string): Promise<string | null> {
    const rows: Array<{ id: string }> = await m.query(
      `SELECT id FROM ${BOSS_SCHEMA}.job
       WHERE name = $1 AND singleton_key = $2
       ORDER BY created_on DESC, id DESC LIMIT 1`,
      [kind, singletonKey],
    );
    return rows[0]?.id ?? null;
  }

  /** The ids of the failed pg-boss jobs of `kind` on `singletonKey`. */
  async failedIds(m: EntityManager, kind: string, singletonKey: string): Promise<string[]> {
    const rows: Array<{ id: string }> = await m.query(
      `SELECT id FROM ${BOSS_SCHEMA}.job
       WHERE name = $1 AND singleton_key = $2 AND state = 'failed'`,
      [kind, singletonKey],
    );
    return rows.map((r) => r.id);
  }

  async setTotal(m: EntityManager, id: string, total: number): Promise<void> {
    await m.query('UPDATE jobs SET progress_total = $2 WHERE id = $1', [id, total]);
  }

  async addDone(m: EntityManager, id: string, done: number): Promise<void> {
    await m.query('UPDATE jobs SET progress_done = progress_done + $2 WHERE id = $1', [id, done]);
  }

  /** Delete the rows of jobs pg-boss has deleted (past their retention). */
  async sweep(): Promise<void> {
    await this.db.manager.query(
      `DELETE FROM jobs j
       WHERE NOT EXISTS (SELECT 1 FROM ${BOSS_SCHEMA}.job b WHERE b.id = j.id)`,
    );
  }
}
