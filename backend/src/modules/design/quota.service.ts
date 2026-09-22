import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { DbContext } from '../../database/db-context';
import { ValidationJsonOutput } from '../../engine/engine.types';
import { SurveyEntity } from '../surveys/survey.entity';
import {
  QUOTA_VALUE_PREFIX,
  QuotaDefinition,
  fullQuotaCodes,
  quotaDefinitions,
} from './quota.helpers';

export interface QuotaStatusDto {
  quotas: (QuotaDefinition & { count: number; full: boolean })[];
}

/**
 * Segment quota counts and the enforcement input. A response counts towards a
 * quota when it is complete, not preview, not disqualified, and the engine
 * saved `Survey.quota_<code> = true` on it.
 *
 * Membership is only ever written while a respondent navigates, so a quota
 * added to a survey that is already collecting starts from zero: responses
 * finished before it existed were never evaluated against it.
 */
@Injectable()
export class QuotaService {
  constructor(private readonly db: DbContext) {}

  /** Completed, non-preview, non-disqualified responses per quota code. */
  async counts(
    surveyId: string,
    codes: string[],
    manager: EntityManager = this.db.manager,
  ): Promise<Record<string, number>> {
    if (codes.length === 0) return {};
    const rows: { key: string; count: number }[] = await manager.query(
      `SELECT kv.key, COUNT(*)::int AS count
         FROM responses r
         CROSS JOIN LATERAL jsonb_each_text(r."values") AS kv(key, value)
        WHERE r.survey_id = $1
          AND r.submit_date IS NOT NULL
          AND r.preview = false
          AND COALESCE(r."values" ->> 'Survey.disqualified', 'false') <> 'true'
          AND kv.key = ANY($2::text[])
          AND kv.value = 'true'
        GROUP BY kv.key`,
      [surveyId, codes.map((code) => QUOTA_VALUE_PREFIX + code)],
    );
    return Object.fromEntries(
      rows.map((row) => [row.key.slice(QUOTA_VALUE_PREFIX.length), Number(row.count)]),
    );
  }

  /** The quotas a respondent may no longer enter. */
  async fullQuotas(survey: SurveyEntity, output: ValidationJsonOutput): Promise<string[]> {
    const definitions = quotaDefinitions(output.survey).filter((quota) => quota.limit > 0);
    if (definitions.length === 0) return [];
    const counts = await this.counts(survey.id, definitions.map((quota) => quota.code));
    return fullQuotaCodes(definitions, counts);
  }

  /** Fill levels for the designer / manage views. */
  async status(survey: SurveyEntity, output: ValidationJsonOutput): Promise<QuotaStatusDto> {
    const definitions = quotaDefinitions(output.survey);
    const counts = await this.counts(survey.id, definitions.map((quota) => quota.code));
    return {
      quotas: definitions.map((quota) => {
        const count = counts[quota.code] ?? 0;
        return { ...quota, count, full: quota.limit > 0 && count >= quota.limit };
      }),
    };
  }
}
