import { Injectable } from '@nestjs/common';
import { DbContext } from '../../database/db-context';
import { SurveyFilter, SurveySort } from './survey.dto';
import { statusToDb } from './survey.enums';
import { RawSurvey, RawVersion } from './survey.mapper';

export interface DashboardRow {
  survey: RawSurvey;
  version: RawVersion;
  response_count: string;
  complete_count: string;
}

export interface OfflineRow {
  survey: RawSurvey;
  version: RawVersion | null;
  complete_count: string | null;
  user_response_count: string | null;
}

/**
 * Read-only data-access for the survey dashboard. Survey/version rows come back
 * via `to_jsonb(...)` so one row carries a whole entity without column-name
 * collisions; counts are bigint strings the mappers parse.
 */
@Injectable()
export class DashboardRepository {
  constructor(private readonly db: DbContext) {}

  /** Number of surveys matching the filter (for the paged count). */
  async countSurveys(filter: SurveyFilter): Promise<number> {
    const rows: Array<{ count: string }> = await this.db.manager.query(
      `SELECT COUNT(*)::int AS count FROM (
         SELECT s.id
         FROM surveys s
         JOIN versions v ON v.survey_id = s.id
         WHERE ${WHERE}
         GROUP BY s.id
       ) sub`,
      filterParams(filter),
    );
    return Number(rows[0]?.count ?? 0);
  }

  /** One page of dashboard rows (survey + latest version + response counts). */
  pageSurveys(
    filter: SurveyFilter,
    sort: SurveySort,
    size: number,
    offset: number,
  ): Promise<DashboardRow[]> {
    const order =
      sort === 'RESPONSES_DESC'
        ? 'complete_count DESC, s.last_modified DESC'
        : 's.last_modified DESC, complete_count DESC';
    return this.db.manager.query(
      `SELECT to_jsonb(s) AS survey,
              to_jsonb(v) AS version,
              COUNT(r.id) AS response_count,
              COUNT(r.submit_date) AS complete_count
         FROM surveys s
         LEFT JOIN responses r ON s.id = r.survey_id AND r.preview = false
         JOIN versions v ON v.survey_id = s.id AND v.version = (
           SELECT MAX(x.version) FROM versions x WHERE x.survey_id = s.id
         )
        WHERE ${WHERE}
        GROUP BY s.id, v.version, v.survey_id
        ORDER BY ${order}
        LIMIT $5 OFFSET $6`,
      [...filterParams(filter), size, offset],
    );
  }

  /** Active offline/mixed surveys, with their response counts (userId scopes the
   *  per-user response count only). */
  offlineSurveys(userId: string): Promise<OfflineRow[]> {
    return this.db.manager.query(
      `SELECT to_jsonb(s) AS survey,
              to_jsonb(v) AS version,
              x.complete_response_count AS complete_count,
              x.user_response_count AS user_response_count
         FROM surveys s
         LEFT JOIN versions v ON v.survey_id = s.id AND v.version = (
           SELECT MAX(x.version) FROM versions x
            WHERE x.survey_id = s.id AND x.published = true
            GROUP BY x.survey_id
         )
         LEFT JOIN (
           SELECT r.survey_id AS survey_id,
                  COUNT(r.survey_id) AS complete_response_count,
                  COUNT(CASE WHEN r.surveyor = $1 THEN 1 ELSE NULL END) AS user_response_count
             FROM responses r
            WHERE r.preview = false AND r.submit_date IS NOT NULL
            GROUP BY r.survey_id
         ) x ON s.id = x.survey_id
        WHERE (s.status = 'ACTIVE' AND (s.usage = 'OFFLINE' OR s.usage = 'MIXED'))
        ORDER BY s.last_modified DESC, complete_count DESC`,
      [userId],
    );
  }
}

// Shared WHERE + params for the count and page queries.
// start_date/end_date are UTC wall clocks (timestamp without time zone), so
// compare against the current UTC wall clock — `now() AT TIME ZONE 'utc'` — to
// stay correct regardless of the DB session's timezone.
const WHERE = `
      ($1::text IS NULL OR s.status = $1)
      AND ($2 = false OR s.start_date > (now() AT TIME ZONE 'utc'))
      AND ($3 = false OR s.end_date < (now() AT TIME ZONE 'utc'))
      AND ($4 = false OR (s.start_date IS NULL OR s.start_date < (now() AT TIME ZONE 'utc'))
                     AND (s.end_date IS NULL OR s.end_date > (now() AT TIME ZONE 'utc')))`;

function filterParams(filter: SurveyFilter): unknown[] {
  return [
    filter.status ? statusToDb(filter.status) : null,
    filter.scheduled,
    filter.expired,
    filter.active,
  ];
}
