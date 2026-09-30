import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { DbContext } from '../../database/db-context';
import { ValidationJsonOutput } from '../../engine/engine.types';
import { SurveyEntity } from '../surveys/survey.entity';
import {
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
 * saved `Survey.quota_<code> = true` on it. A database trigger mirrors the last
 * two into `responses.quota_codes` (migration 2-ResponseQuotaCodes).
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
    const rows: { code: string; count: number }[] = await manager.query(
      `SELECT code, COUNT(*)::int AS count
         FROM responses r
         CROSS JOIN unnest(r.quota_codes) AS code
        WHERE r.survey_id = $1
          AND r.submit_date IS NOT NULL
          AND r.preview = false
          AND code = ANY($2::text[])
        GROUP BY code`,
      [surveyId, codes],
    );
    return Object.fromEntries(rows.map((row) => [row.code, Number(row.count)]));
  }

  /** The quotas a respondent may no longer enter. */
  async fullQuotas(survey: SurveyEntity, output: ValidationJsonOutput): Promise<string[]> {
    const definitions = quotaDefinitions(output.survey).filter((quota) => quota.limit > 0);
    if (definitions.length === 0) return [];
    const counts = await this.counts(survey.id, definitions.map((quota) => quota.code));
    return fullQuotaCodes(definitions, counts);
  }

  /**
   * Fill levels for the designer / manage views: the draft's quotas, `full` by
   * the published limits (the ones navigation enforces; none before publishing).
   */
  async status(
    survey: SurveyEntity,
    draft: ValidationJsonOutput,
    published: ValidationJsonOutput | null,
  ): Promise<QuotaStatusDto> {
    const definitions = quotaDefinitions(draft.survey);
    const counts = await this.counts(survey.id, definitions.map((quota) => quota.code));
    const full = new Set(
      published ? fullQuotaCodes(quotaDefinitions(published.survey), counts) : [],
    );
    return {
      quotas: definitions.map((quota) => ({
        ...quota,
        count: counts[quota.code] ?? 0,
        full: full.has(quota.code),
      })),
    };
  }
}
