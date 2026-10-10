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

  async memberCounts(surveyIds: string[]): Promise<Record<string, Record<string, number>>> {
    const result: Record<string, Record<string, number>> = Object.fromEntries(
      surveyIds.map((id) => [id, {}]),
    );
    if (surveyIds.length === 0) return result;
    const rows: { survey_id: string; code: string; count: number }[] = await this.db.manager.query(
      `SELECT r.survey_id, code, COUNT(*)::int AS count
         FROM responses r
         CROSS JOIN unnest(r.quota_codes) AS code
        WHERE r.survey_id = ANY($1::uuid[])
          AND r.submit_date IS NOT NULL
          AND r.preview = false
        GROUP BY r.survey_id, code`,
      [surveyIds],
    );
    for (const row of rows) result[row.survey_id][row.code] = Number(row.count);
    return result;
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
