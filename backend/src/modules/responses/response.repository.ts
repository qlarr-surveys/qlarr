import { Injectable } from '@nestjs/common';
import { DeepPartial, Repository } from 'typeorm';
import { UUID_RE } from '../../common/validation';
import { DbContext } from '../../database/db-context';
import { SurveyResponseEntity } from '../run/survey-response.entity';
import {
  ResponseStatus,
  ResponseSummary,
  ResponseUploadFile,
} from './response.dto';

/** A response row for the DB-value export (fixed metadata columns + raw values). */
export interface ResponseExportRow {
  index: number;
  id: string;
  startDate: string | null;
  submitDate: string | null;
  lang: string;
  values: Record<string, unknown>;
}

/** A response row for bulk file download (id + index + raw values). */
export interface ResponseFileRow {
  id: string;
  index: number;
  values: Record<string, unknown> | null;
}

/** A response joined to its surveyor's name (raw; index coerced by the caller). */
export interface ResponseDetailRow {
  id: string;
  version: number;
  surveyId: string;
  preview: boolean;
  surveyor: string | null;
  startDate: string;
  submitDate: string | null;
  lang: string;
  ipAddress: string | null;
  index: number | null;
  events: unknown[];
  values: Record<string, unknown>;
  firstName: string | null;
  lastName: string | null;
}

/**
 * Data-access for the `responses` table, shared by ResponseService (list,
 * export, read, delete) and ResponseOpsService (offline sync, file uploads).
 * Resolves the repository per call from the request-scoped manager.
 */
@Injectable()
export class ResponseRepository {
  constructor(private readonly db: DbContext) {}

  private get repo(): Repository<SurveyResponseEntity> {
    return this.db.manager.getRepository(SurveyResponseEntity);
  }

  /**
   * A response entity by id (the full row, for the run flow), or null.
   *
   * Rejects a missing/malformed id up front. A body-sourced `responseId` can be
   * `undefined` (the run DTOs are interfaces, and there is no ValidationPipe),
   * and typeorm's `findOne({ where: { id: undefined } })` silently drops the
   * condition — degrading to `SELECT … LIMIT 1` and returning an *arbitrary*
   * row. The UUID guard also spares Postgres a uuid-parse 500 on a
   * malformed id; both cases now surface as a clean not-found (400).
   */
  findById(responseId: string): Promise<SurveyResponseEntity | null> {
    if (!UUID_RE.test(responseId)) return Promise.resolve(null);
    return this.repo.findOne({ where: { id: responseId } });
  }

  /** Count of completed (submitted, non-preview) responses for a survey. */
  async completedCount(surveyId: string): Promise<number> {
    const [row] = await this.db.manager.query(
      `SELECT COUNT(*) AS count FROM responses
       WHERE survey_id = $1 AND submit_date IS NOT NULL AND preview = false`,
      [surveyId],
    );
    return Number(row.count);
  }

  /** True if a response with this id exists. */
  async exists(responseId: string): Promise<boolean> {
    const rows = await this.db.manager.query(
      `SELECT 1 FROM responses WHERE id = $1`,
      [responseId],
    );
    return rows.length > 0;
  }

  /** Persist a response (offline sync). */
  save(response: DeepPartial<SurveyResponseEntity>): Promise<SurveyResponseEntity> {
    return this.repo.save(this.repo.create(response));
  }

  /** Delete a response by id. */
  async deleteById(responseId: string): Promise<void> {
    await this.db.manager.query(`DELETE FROM responses WHERE id = $1`, [
      responseId,
    ]);
  }

  /** Non-preview responses in the index range [from,to], optional completeness. */
  findInIndexRange(
    surveyId: string,
    complete: boolean | undefined,
    from: number,
    to: number,
  ): Promise<ResponseExportRow[]> {
    const [lower, upper] = [Math.min(from, to), Math.max(from, to)];
    return this.db.manager.query(
      `SELECT survey_response_index AS index, id,
              to_char(start_date, 'YYYY-MM-DD HH24:MI:SS') AS "startDate",
              to_char(submit_date, 'YYYY-MM-DD HH24:MI:SS') AS "submitDate",
              lang, "values"
       FROM responses
       WHERE survey_id = $1 AND preview = false ${completeClause(complete)}
         AND survey_response_index BETWEEN $2 AND $3
       ORDER BY survey_response_index ASC`,
      [surveyId, lower, upper],
    );
  }

  /** id/index/values for responses in the index range (bulk file download). */
  findFilesInIndexRange(
    surveyId: string,
    complete: boolean | undefined,
    from: number,
    to: number,
  ): Promise<ResponseFileRow[]> {
    const [lower, upper] = [Math.min(from, to), Math.max(from, to)];
    return this.db.manager.query(
      `SELECT id, survey_response_index AS index, "values" AS values
       FROM responses
       WHERE survey_id = $1 AND preview = false
         AND survey_response_index BETWEEN $2 AND $3 ${completeClause(complete)}
       ORDER BY survey_response_index ASC`,
      [surveyId, lower, upper],
    );
  }

  /** Total responses matching the summary filter. */
  async countForSummary(
    surveyId: string,
    status: ResponseStatus,
    surveyor?: string,
  ): Promise<number> {
    const where = buildSummaryWhere(surveyId, status, surveyor);
    const [{ count }] = await this.db.manager.query(
      `SELECT COUNT(*) AS count FROM responses r WHERE ${where.clause}`,
      where.params,
    );
    return Number(count);
  }

  /** One page of summary rows (surveyor name joined in), newest-start first. */
  summaryPage(
    surveyId: string,
    status: ResponseStatus,
    surveyor: string | undefined,
    size: number,
    offset: number,
  ): Promise<ResponseSummary[]> {
    const where = buildSummaryWhere(surveyId, status, surveyor);
    return this.db.manager.query(
      `SELECT r.id AS id, r.survey_response_index AS index, r.survey_id AS "surveyId",
              r.surveyor AS surveyor,
              to_char(r.start_date, 'YYYY-MM-DD HH24:MI:SS') AS "startDate",
              to_char(r.submit_date, 'YYYY-MM-DD HH24:MI:SS') AS "submitDate",
              r.lang AS lang, r.preview AS preview,
              CAST((r.values ->> 'Survey.disqualified') AS boolean) AS disqualified,
              u.first_name AS "firstName", u.last_name AS "lastName"
       FROM responses r
       LEFT JOIN users u ON r.surveyor = u.id
       WHERE ${where.clause}
       ORDER BY r.start_date ASC
       LIMIT $${where.params.length + 1} OFFSET $${where.params.length + 2}`,
      [...where.params, size, offset],
    );
  }

  /** A response with its surveyor's name (LEFT JOIN users), or null if unknown. */
  async findWithSurveyorName(responseId: string): Promise<ResponseDetailRow | null> {
    const [row] = await this.db.manager.query(
      `SELECT r.id, r.version, r.survey_id AS "surveyId", r.preview, r.surveyor,
              to_char(r.start_date, 'YYYY-MM-DD HH24:MI:SS') AS "startDate",
              to_char(r.submit_date, 'YYYY-MM-DD HH24:MI:SS') AS "submitDate",
              r.lang, r.ip_addr AS "ipAddress",
              r.survey_response_index AS index, r.events, r."values",
              u.first_name AS "firstName", u.last_name AS "lastName"
       FROM responses r
       LEFT JOIN users u ON r.surveyor = u.id
       WHERE r.id = $1`,
      [responseId],
    );
    return row ?? null;
  }

  /** Complete + this-user response counts for a survey. */
  async counts(
    surveyId: string,
    userId: string,
  ): Promise<{ completeResponseCount: number; userResponseCount: number }> {
    const [row] = await this.db.manager.query(
      `SELECT COUNT(submit_date) AS "completeResponseCount",
              COUNT(CASE WHEN surveyor = $2 THEN 1 END) AS "userResponseCount"
       FROM responses
       WHERE survey_id = $1 AND preview = false AND submit_date IS NOT NULL`,
      [surveyId, userId],
    );
    return {
      completeResponseCount: Number(row.completeResponseCount),
      userResponseCount: Number(row.userResponseCount),
    };
  }

  /** Store an uploaded-file descriptor into a question's `values` entry. */
  async setFileValue(
    responseId: string,
    questionId: string,
    uploaded: ResponseUploadFile,
  ): Promise<void> {
    await this.db.manager.query(
      `UPDATE responses
         SET "values" = jsonb_set(COALESCE("values", '{}'::jsonb), ARRAY[$2], $3::jsonb)
       WHERE id = $1`,
      [responseId, `${questionId}.value`, JSON.stringify(uploaded)],
    );
  }

  /** The stored-file descriptor a question holds, plus the response index. */
  async findFileValue(
    responseId: string,
    questionId: string,
  ): Promise<{
    index: number;
    value: { filename?: string; stored_filename?: string } | null;
  } | null> {
    const [row] = await this.db.manager.query(
      `SELECT survey_response_index AS "index", "values" -> $2 AS value
       FROM responses WHERE id = $1`,
      [responseId, `${questionId}.value`],
    );
    return row ?? null;
  }

  /**
   * Whether a survey is currently active (status ACTIVE + within its date
   * window). Null when the survey does not exist.
   */
  async surveyActive(surveyId: string): Promise<boolean | null> {
    const [row] = await this.db.manager.query(
      `SELECT (
         status = 'ACTIVE'
         AND (end_date IS NULL OR end_date > (now() AT TIME ZONE 'utc'))
         AND (start_date IS NULL OR start_date < (now() AT TIME ZONE 'utc'))
       ) AS active
       FROM surveys WHERE id = $1`,
      [surveyId],
    );
    return row ? row.active === true : null;
  }

  /**
   * Whether a survey's status is ACTIVE, ignoring the date window. Null when
   * the survey does not exist. Offline sync accepts late uploads for a
   * still-ACTIVE survey, so it checks status only (the status-only check on the
   * offline paths).
   */
  async surveyStatusActive(surveyId: string): Promise<boolean | null> {
    const [row] = await this.db.manager.query(
      `SELECT (status = 'ACTIVE') AS active FROM surveys WHERE id = $1`,
      [surveyId],
    );
    return row ? row.active === true : null;
  }

  /** Whether a survey with this id exists. */
  async surveyExists(surveyId: string): Promise<boolean> {
    const [row] = await this.db.manager.query(
      `SELECT 1 FROM surveys WHERE id = $1`,
      [surveyId],
    );
    return !!row;
  }
}

/** Non-preview completeness fragment shared by the index-range queries. */
function completeClause(complete: boolean | undefined): string {
  if (complete === undefined) return '';
  return complete ? 'AND submit_date IS NOT NULL' : 'AND submit_date IS NULL';
}

/** WHERE clause + params for the summary filter (surveyor wins over status). */
function buildSummaryWhere(
  surveyId: string,
  status: ResponseStatus,
  surveyor?: string,
): { clause: string; params: unknown[] } {
  if (surveyor) {
    return {
      clause: 'r.survey_id = $1 AND r.surveyor = $2',
      params: [surveyId, surveyor],
    };
  }
  const base = 'r.survey_id = $1';
  switch (status) {
    case 'PREVIEW':
      return { clause: `${base} AND r.preview = TRUE`, params: [surveyId] };
    case 'COMPLETE':
      return {
        clause: `${base} AND r.preview = FALSE AND r.submit_date IS NOT NULL`,
        params: [surveyId],
      };
    case 'INCOMPLETE':
      return {
        clause: `${base} AND r.preview = FALSE AND r.submit_date IS NULL`,
        params: [surveyId],
      };
    default:
      return { clause: base, params: [surveyId] };
  }
}
