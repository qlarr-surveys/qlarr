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

@Injectable()
export class QuotaService {
  constructor(private readonly db: DbContext) {}

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

  async fullQuotas(survey: SurveyEntity, output: ValidationJsonOutput): Promise<string[]> {
    const definitions = quotaDefinitions(output.survey).filter((quota) => quota.limit > 0);
    if (definitions.length === 0) return [];
    const counts = await this.counts(survey.id, definitions.map((quota) => quota.code));
    return fullQuotaCodes(definitions, counts);
  }

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
