import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DbContext } from '../../database/db-context';
import { Calculation } from '../../engine/engine.types';
import { RUN_TIME_LIMIT_SECONDS } from './calculations.constants';
import { CalculationsRevisionConflictException } from './calculations.exceptions';
import {
  CalculationStatus,
  SurveyCalculationsEntity,
} from './survey-calculations.entity';

/** SQL: the row's run started more than the time limit ago. */
const RUN_EXPIRED = `started_at < now() - make_interval(secs => ${RUN_TIME_LIMIT_SECONDS})`;

/**
 * Data-access for `survey_calculations` (the set and its Compute run state) and
 * the per-response results in `responses.computations`. The only writer of that
 * column: the response entity marks it `update: false`.
 *
 * Results are only shown when `status = completed`: a save sets `idle`, so it
 * hides them without touching `responses`.
 *
 * A Compute run is identified by its `started_at`, which `startRun` returns as
 * full-precision Postgres text. Every write a run makes is conditional on the
 * row still being `running` with that `started_at`, so a run that has expired
 * (or been replaced by a newer one) can't write anything.
 */
@Injectable()
export class CalculationsRepository {
  constructor(private readonly db: DbContext) {}

  private get repo(): Repository<SurveyCalculationsEntity> {
    return this.db.manager.getRepository(SurveyCalculationsEntity);
  }

  /** The survey's row, or null when calculations were never saved. */
  find(surveyId: string): Promise<SurveyCalculationsEntity | null> {
    return this.repo.findOne({ where: { surveyId } });
  }

  /**
   * Store a validated set, bump `revision` and set `status = idle` (hiding the
   * stored results), only if `expectedRevision` is still current. A survey
   * without a row is at revision 0, so the first save (expected 0) inserts it.
   * Returns the new revision; a stale revision throws the 409 exception.
   */
  async saveSet(
    surveyId: string,
    calculations: Calculation[],
    expectedRevision: number,
  ): Promise<number> {
    // At revision 0 the row may not exist yet (or exists from clone/import), so
    // upsert; past 0 it must exist, so a plain conditional update.
    const sql =
      expectedRevision === 0
        ? `INSERT INTO survey_calculations (survey_id, calculations, revision, updated_at)
           VALUES ($1, $2::jsonb, 1, now())
           ON CONFLICT (survey_id) DO UPDATE
             SET calculations = EXCLUDED.calculations,
                 revision = survey_calculations.revision + 1,
                 status = 'idle',
                 updated_at = now()
             WHERE survey_calculations.revision = $3
           RETURNING revision`
        : `UPDATE survey_calculations
           SET calculations = $2::jsonb, revision = revision + 1, status = 'idle',
               updated_at = now()
           WHERE survey_id = $1 AND revision = $3
           RETURNING revision`;
    const rows = returnedRows<{ revision: number }>(
      await this.db.manager.query(sql, [
        surveyId,
        JSON.stringify(calculations),
        expectedRevision,
      ]),
    );
    if (rows.length === 0) throw new CalculationsRevisionConflictException();
    return rows[0].revision;
  }

  /**
   * Start a run: `running`, `started_at = now()`, progress `0/total`. Only if no
   * run is going (a `running` row past the time limit counts as not running).
   * Returns the run's `started_at`, or null if a run is already going or the
   * survey has no row.
   */
  async startRun(surveyId: string, total: number): Promise<string | null> {
    const rows = returnedRows<{ started_at: string }>(
      await this.db.manager.query(
        `UPDATE survey_calculations
         SET status = 'running', started_at = now(), progress_done = 0,
             progress_total = $2, updated_at = now()
         WHERE survey_id = $1 AND (status <> 'running' OR ${RUN_EXPIRED})
         RETURNING started_at::text AS started_at`,
        [surveyId, total],
      ),
    );
    return rows[0]?.started_at ?? null;
  }

  /**
   * Record a run's progress and/or its final status, only while it is still
   * the current run. Returns whether the row was updated; a run that gets
   * `false` has expired or been replaced, and must stop.
   */
  async updateRun(
    surveyId: string,
    startedAt: string,
    changes: { progressDone?: number; status?: CalculationStatus },
  ): Promise<boolean> {
    const rows = returnedRows(
      await this.db.manager.query(
        `UPDATE survey_calculations
         SET progress_done = COALESCE($3, progress_done),
             status = COALESCE($4, status),
             updated_at = now()
         WHERE survey_id = $1 AND status = 'running' AND started_at = $2::timestamp
         RETURNING survey_id`,
        [surveyId, startedAt, changes.progressDone ?? null, changes.status ?? null],
      ),
    );
    return rows.length > 0;
  }

  /** Mark a run that has been `running` past the time limit as `failed`. */
  async expireStaleRun(surveyId: string): Promise<void> {
    await this.db.manager.query(
      `UPDATE survey_calculations SET status = 'failed', updated_at = now()
       WHERE survey_id = $1 AND status = 'running' AND ${RUN_EXPIRED}`,
      [surveyId],
    );
  }

  /**
   * Write Compute results for a chunk of the survey's responses, replacing any
   * earlier ones, only while the run started at `startedAt` is still current
   * (checked in the same statement). Returns the number of responses written;
   * 0 means the run has expired or been replaced.
   */
  async writeComputations(
    surveyId: string,
    rows: Array<{ id: string; computations: Record<string, unknown> }>,
    startedAt: string,
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const params: unknown[] = [surveyId, startedAt];
    const values = rows.map((row) => {
      params.push(row.id, JSON.stringify(row.computations));
      return `($${params.length - 1}::uuid, $${params.length}::jsonb)`;
    });
    const written = returnedRows(
      await this.db.manager.query(
        `UPDATE responses AS r
         SET computations = v.computations
         FROM (VALUES ${values.join(', ')}) AS v(id, computations),
              survey_calculations AS c
         WHERE r.id = v.id
           AND r.survey_id = $1::uuid
           AND c.survey_id = r.survey_id
           AND c.status = 'running' AND c.started_at = $2::timestamp
         RETURNING r.id`,
        params,
      ),
    );
    return written.length;
  }

  /** On boot, a run that was `running` can't still be: mark it `failed`. */
  async resetRunningOnBoot(): Promise<void> {
    await this.db.manager.query(
      `UPDATE survey_calculations SET status = 'failed', updated_at = now()
       WHERE status = 'running'`,
    );
  }

  /** Copy a survey's set to another survey (clone), at revision 0 and idle. */
  async copyToSurvey(source: string, destination: string): Promise<void> {
    await this.db.manager.query(
      `INSERT INTO survey_calculations (survey_id, calculations, updated_at)
       SELECT $2, calculations, now() FROM survey_calculations WHERE survey_id = $1`,
      [source, destination],
    );
  }

  /** Store an imported (already validated) set, at revision 0 and idle. */
  async insertImported(
    surveyId: string,
    calculations: Calculation[],
  ): Promise<void> {
    await this.db.manager.query(
      `INSERT INTO survey_calculations (survey_id, calculations, updated_at)
       VALUES ($1, $2::jsonb, now())`,
      [surveyId, JSON.stringify(calculations)],
    );
  }
}

/**
 * The rows of a `RETURNING` query. TypeORM's postgres driver returns a plain row
 * array for INSERT, but `[rows, affectedCount]` for UPDATE.
 */
function returnedRows<T = unknown>(result: unknown): T[] {
  if (
    Array.isArray(result) &&
    result.length === 2 &&
    Array.isArray(result[0]) &&
    typeof result[1] === 'number'
  ) {
    return result[0] as T[];
  }
  return result as T[];
}
