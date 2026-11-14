import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { returnedRows } from '../../common/returned-rows';
import { DbContext } from '../../database/db-context';
import { Calculation } from '../../engine/engine.types';
import { replaceCode } from '../../engine/replace-code';
import { pendingFilter } from '../../jobs/job-failures.repository';
import { CALC_COMPUTE } from './calculations.constants';
import { CalculationsRevisionConflictException } from './calculations.exceptions';
import { SurveyCalculationsEntity } from './survey-calculations.entity';

/** A response Compute failed on, which only a retry runs again; `$1` is the survey. */
const NOT_FAILED = pendingFilter('responses.id', `'${CALC_COMPUTE}'`, '$1', `''`);

function isOutOfDate(calculation: Calculation): boolean {
  return (calculation.errors ?? []).some((e) => e.name === 'OutOfDate');
}

/**
 * A component code rename: rewrite the code in the set's expressions, bumping
 * `revision` if any changed so an editor still holding the old set gets a
 * conflict instead of saving it back. A plain function rather than a
 * repository method, since DesignModule can't import CalculationsModule
 * (which imports it).
 */
export async function renameCodeInCalculations(
  manager: EntityManager,
  surveyId: string,
  from: string,
  to: string,
): Promise<void> {
  const rows = await manager.query<{ calculations: Calculation[] }[]>(
    `SELECT calculations FROM survey_calculations WHERE survey_id = $1 FOR UPDATE`,
    [surveyId],
  );
  if (rows.length === 0) return;
  const before = rows[0].calculations;
  const after = before.map((c) => ({
    ...c,
    expression: replaceCode(c.expression, from, to),
  }));
  if (after.every((c, i) => c.expression === before[i].expression)) return;
  await manager.query(
    `UPDATE survey_calculations
     SET calculations = $2::jsonb, revision = revision + 1, updated_at = now()
     WHERE survey_id = $1`,
    [surveyId, JSON.stringify(after)],
  );
}

/**
 * Data-access for `survey_calculations` (the set) and the per-response results
 * in `responses.computations`. The only writer of that column: the response
 * entity marks it `update: false`.
 *
 * Any results that exist are valid for the current set: a change to the set or
 * the design clears them (`clearComputations`), and a Compute writes only
 * while the `results_epoch` it started with is current.
 */
@Injectable()
export class CalculationsRepository {
  constructor(private readonly db: DbContext) {}

  private repo(manager: EntityManager): Repository<SurveyCalculationsEntity> {
    return manager.getRepository(SurveyCalculationsEntity);
  }

  /** The survey's row, or null when calculations were never saved. */
  find(
    surveyId: string,
    manager: EntityManager = this.db.manager,
  ): Promise<SurveyCalculationsEntity | null> {
    return this.repo(manager).findOne({ where: { surveyId } });
  }

  /**
   * Store a validated set and bump `revision`, only if `expectedRevision` is
   * still current. A survey without a row is at revision 0, so the first save
   * (expected 0) inserts it. Returns the new revision; a stale revision throws
   * 409.
   */
  async saveSet(
    surveyId: string,
    calculations: Calculation[],
    expectedRevision: number,
    manager: EntityManager = this.db.manager,
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
                 updated_at = now()
             WHERE survey_calculations.revision = $3
           RETURNING revision`
        : `UPDATE survey_calculations
           SET calculations = $2::jsonb, revision = revision + 1, updated_at = now()
           WHERE survey_id = $1 AND revision = $3
           RETURNING revision`;
    const rows = returnedRows<{ revision: number }>(
      await manager.query(sql, [surveyId, JSON.stringify(calculations), expectedRevision]),
    );
    if (rows.length === 0) throw new CalculationsRevisionConflictException();
    return rows[0].revision;
  }

  /**
   * A design change: mark every calculation `OutOfDate` until the next Save
   * validates it. `revision` stays: the authored set is unchanged. False when
   * there was nothing to mark: no set, or one already marked.
   */
  async markOutOfDate(manager: EntityManager, surveyId: string): Promise<boolean> {
    const rows = await manager.query<{ calculations: Calculation[] }[]>(
      `SELECT calculations FROM survey_calculations WHERE survey_id = $1 FOR UPDATE`,
      [surveyId],
    );
    const set = rows[0]?.calculations ?? [];
    if (set.every(isOutOfDate)) return false;
    const marked = set.map((c) =>
      isOutOfDate(c)
        ? c
        : { ...c, errors: [...(c.errors ?? []), { name: 'OutOfDate' as const }] },
    );
    await manager.query(
      `UPDATE survey_calculations SET calculations = $2::jsonb, updated_at = now()
       WHERE survey_id = $1`,
      [surveyId, JSON.stringify(marked)],
    );
    return true;
  }

  /**
   * Delete the survey's results and bump `results_epoch`, so no Compute that
   * started before writes any more. The bump goes first: it waits for a results
   * write in flight, so the delete catches it.
   */
  async clearComputations(manager: EntityManager, surveyId: string): Promise<void> {
    await manager.query(
      `UPDATE survey_calculations SET results_epoch = results_epoch + 1
       WHERE survey_id = $1`,
      [surveyId],
    );
    await manager.query(
      `UPDATE responses SET computations = NULL
       WHERE survey_id = $1 AND computations IS NOT NULL`,
      [surveyId],
    );
  }

  /**
   * Write Compute results for a chunk of the survey's responses, only while
   * `results_epoch` is still `epoch`. The row is read `FOR SHARE`, so a clear
   * either waits for this write to land (and deletes it) or commits first (and
   * this writes nothing). Returns the ids written.
   */
  async writeComputations(
    manager: EntityManager,
    epoch: number,
    surveyId: string,
    rows: Array<{ id: string; computations: Record<string, unknown> }>,
  ): Promise<string[]> {
    if (rows.length === 0) return [];
    const params: unknown[] = [surveyId, epoch];
    const values = rows.map((row) => {
      params.push(row.id, JSON.stringify(row.computations));
      return `($${params.length - 1}::uuid, $${params.length}::jsonb)`;
    });
    const written: Array<{ id: string }> = returnedRows(
      await manager.query(
        `WITH c AS (
           SELECT survey_id FROM survey_calculations
           WHERE survey_id = $1::uuid AND results_epoch = $2
           FOR SHARE
         )
         UPDATE responses AS r
         SET computations = v.computations
         FROM (VALUES ${values.join(', ')}) AS v(id, computations), c
         WHERE r.id = v.id AND r.survey_id = $1::uuid
         RETURNING r.id`,
        params,
      ),
    );
    return written.map((r) => r.id);
  }

  /**
   * Whether `results_epoch` is still `epoch`, reading the row `FOR SHARE` so a
   * clear in flight is waited for.
   */
  async isEpochCurrent(manager: EntityManager, surveyId: string, epoch: number): Promise<boolean> {
    const rows: unknown[] = await manager.query(
      `SELECT 1 FROM survey_calculations
       WHERE survey_id = $1 AND results_epoch = $2
       FOR SHARE`,
      [surveyId, epoch],
    );
    return rows.length > 0;
  }

  async surveyExists(surveyId: string): Promise<boolean> {
    const rows: unknown[] = await this.db.manager.query(
      `SELECT 1 FROM surveys WHERE id = $1`,
      [surveyId],
    );
    return rows.length > 0;
  }

  /**
   * Ids of the survey's completed responses (previews included) without
   * results and not failed, by response index, at most `limit`: what Compute
   * runs on.
   */
  async uncomputedResponseIds(
    surveyId: string,
    limit: number,
    manager: EntityManager = this.db.manager,
  ): Promise<string[]> {
    const rows: Array<{ id: string }> = await manager.query(
      `SELECT id FROM responses
       WHERE survey_id = $1 AND submit_date IS NOT NULL AND computations IS NULL
         AND ${NOT_FAILED}
       ORDER BY survey_response_index
       LIMIT $2`,
      [surveyId, limit],
    );
    return rows.map((r) => r.id);
  }

  /** Stored values by response id, for a chunk of a Compute. */
  async responseValues(
    ids: string[],
    manager: EntityManager = this.db.manager,
  ): Promise<Record<string, Record<string, unknown>>> {
    const rows: Array<{ id: string; values: Record<string, unknown> | null }> =
      await manager.query(
        `SELECT id, "values" FROM responses WHERE id = ANY($1::uuid[])`,
        [ids],
      );
    return Object.fromEntries(rows.map((r) => [r.id, r.values ?? {}]));
  }

  /** The most recent completed responses (previews included), for a dry run. */
  recentCompleted(
    surveyId: string,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      index: number | null;
      preview: boolean;
      values: Record<string, unknown> | null;
    }>
  > {
    return this.db.manager.query(
      `SELECT id, survey_response_index AS index, preview, "values"
       FROM responses
       WHERE survey_id = $1 AND submit_date IS NOT NULL
       ORDER BY submit_date DESC
       LIMIT $2`,
      [surveyId, limit],
    );
  }

  /** Completed responses without results and not failed: what the next Compute runs. */
  async countWithoutComputations(surveyId: string): Promise<number> {
    const [{ count }]: Array<{ count: string }> = await this.db.manager.query(
      `SELECT COUNT(*) AS count FROM responses
       WHERE survey_id = $1 AND submit_date IS NOT NULL AND computations IS NULL
         AND ${NOT_FAILED}`,
      [surveyId],
    );
    return Number(count);
  }

  /** Whether any response of the survey has results. */
  async hasComputations(surveyId: string): Promise<boolean> {
    const rows: unknown[] = await this.db.manager.query(
      `SELECT 1 FROM responses
       WHERE survey_id = $1 AND computations IS NOT NULL
       LIMIT 1`,
      [surveyId],
    );
    return rows.length > 0;
  }

  /** Copy a survey's set to another survey (clone), at revision 0. */
  async copyToSurvey(source: string, destination: string): Promise<void> {
    await this.db.manager.query(
      `INSERT INTO survey_calculations (survey_id, calculations, updated_at)
       SELECT $2, calculations, now() FROM survey_calculations WHERE survey_id = $1`,
      [source, destination],
    );
  }

  /** Store an imported (already validated) set, at revision 0. */
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
