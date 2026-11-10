import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { formatWallClockUtc, nowUtcString } from '../common/datetime';
import { DbContext } from '../database/db-context';
import { Job, ResponseFailure } from './job-handler';

/** One failed response, as the failures endpoint lists it. */
export interface JobFailureRow {
  responseId: string;
  error: string;
  failedAt: string;
}

/**
 * SQL for a handler's `pending` query: `idColumn` has no failure on the
 * subject. `kind`, `surveyId` and `subjectKey` are the query's placeholders
 * (or literals) for the subject.
 */
export function pendingFilter(
  idColumn: string,
  kind: string,
  surveyId: string,
  subjectKey: string,
): string {
  return `NOT EXISTS (
    SELECT 1 FROM job_failures f
    WHERE f.kind = ${kind} AND f.survey_id = ${surveyId}
      AND f.subject_key = ${subjectKey} AND f.response_id = ${idColumn})`;
}

/**
 * Data access for `job_failures`: the responses a subject's jobs failed on.
 * A row stays until a retry succeeds on its response or the subject is
 * invalidated; it goes with its survey and its response (FK cascade).
 */
@Injectable()
export class JobFailuresRepository {
  constructor(private readonly db: DbContext) {}

  /**
   * Upsert the job's failures, so a retry overwrites the error. A response
   * deleted since the job read it is skipped, not an FK violation.
   */
  async record(m: EntityManager, job: Job, failures: ResponseFailure[]): Promise<void> {
    if (failures.length === 0) return;
    await m.query(
      `INSERT INTO job_failures (kind, survey_id, subject_key, response_id, error, failed_at)
       SELECT $1, $2, $3, f.id, f.error, $6
       FROM unnest($4::uuid[], $5::text[]) AS f(id, error)
       WHERE EXISTS (SELECT 1 FROM responses r WHERE r.id = f.id)
       ON CONFLICT (kind, survey_id, subject_key, response_id)
       DO UPDATE SET error = EXCLUDED.error, failed_at = EXCLUDED.failed_at`,
      [
        job.kind,
        job.surveyId,
        job.subjectKey,
        failures.map((f) => f.id),
        failures.map((f) => f.error),
        nowUtcString(),
      ],
    );
  }

  /** Delete the failures of responses the job now did. */
  async clear(m: EntityManager, job: Job, responseIds: string[]): Promise<void> {
    if (responseIds.length === 0) return;
    await m.query(
      `DELETE FROM job_failures
       WHERE kind = $1 AND survey_id = $2 AND subject_key = $3
         AND response_id = ANY($4::uuid[])`,
      [job.kind, job.surveyId, job.subjectKey, responseIds],
    );
  }

  /** What a retry works on: the subject's failed responses, by id, at most `limit`. */
  async responseIds(m: EntityManager, job: Job, limit: number): Promise<string[]> {
    const rows: Array<{ id: string }> = await m.query(
      `SELECT response_id AS id FROM job_failures
       WHERE kind = $1 AND survey_id = $2 AND subject_key = $3
       ORDER BY response_id
       LIMIT $4`,
      [job.kind, job.surveyId, job.subjectKey, limit],
    );
    return rows.map((r) => r.id);
  }

  async count(kind: string, surveyId: string, subjectKey: string): Promise<number> {
    const [{ count }]: Array<{ count: string }> = await this.db.manager.query(
      `SELECT COUNT(*) AS count FROM job_failures
       WHERE kind = $1 AND survey_id = $2 AND subject_key = $3`,
      [kind, surveyId, subjectKey],
    );
    return Number(count);
  }

  /** One page (1-based) of the subject's failures, by response id. */
  async page(
    kind: string,
    surveyId: string,
    subjectKey: string,
    page: number,
    perPage: number,
  ): Promise<JobFailureRow[]> {
    const rows: Array<{ responseId: string; error: string; failedAt: Date }> =
      await this.db.manager.query(
        `SELECT response_id AS "responseId", error, failed_at AS "failedAt"
         FROM job_failures
         WHERE kind = $1 AND survey_id = $2 AND subject_key = $3
         ORDER BY response_id
         LIMIT $4 OFFSET $5`,
        [kind, surveyId, subjectKey, perPage, (page - 1) * perPage],
      );
    return rows.map((r) => ({
      ...r,
      failedAt: formatWallClockUtc(r.failedAt),
    }));
  }

  /** The subject's input changed: its failures no longer apply. */
  async deleteSubject(
    tx: EntityManager,
    kind: string,
    surveyId: string,
    subjectKey: string,
  ): Promise<void> {
    await tx.query(
      `DELETE FROM job_failures WHERE kind = $1 AND survey_id = $2 AND subject_key = $3`,
      [kind, surveyId, subjectKey],
    );
  }
}
