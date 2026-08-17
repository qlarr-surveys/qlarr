import { Injectable } from '@nestjs/common';
import { stripTags } from '../../common/strip-tags';
import { EngineService } from '../../engine/engine.service';
import { ResponseField } from '../../engine/engine.types';
import { DbContext } from '../../database/db-context';
import { DesignService } from '../design/design.service';
import {
  AnalyticsDto,
  AnalyticsOption,
  AnalyticsQuestion,
  FrequencyCount,
  MatrixSummaryItem,
  NpsSummary,
  NumberSummary,
  RankingSummaryItem,
} from './analytics.dto';

export const DEFAULT_MAX_RESPONSES = 5000;

const CHOICE_TYPES = new Set([
  'SCQ', 'MCQ', 'RANKING', 'IMAGE_RANKING', 'AUTOCOMPLETE',
  'ICON_SCQ', 'ICON_MCQ', 'IMAGE_SCQ', 'IMAGE_MCQ', 'NPS',
]);
const MULTIPLE_TEXT = 'MULTIPLE_TEXT';
const MCQ_ARRAY = 'MCQ_ARRAY';
const MATRIX_TYPES = new Set(['SCQ_ARRAY', MCQ_ARRAY, 'SCQ_ICON_ARRAY', 'MCQ_ICON_ARRAY']);
const RANKING_TYPES = new Set(['RANKING', 'IMAGE_RANKING']);
const ICON_IMAGE_CHOICE_TYPES = new Set(['ICON_SCQ', 'ICON_MCQ', 'IMAGE_SCQ', 'IMAGE_MCQ']);
const SINGLE_CHOICE_TYPES = new Set(['SCQ', 'AUTOCOMPLETE', 'IMAGE_SCQ', 'ICON_SCQ']);
const MULTI_CHOICE_TYPES = new Set(['MCQ', 'IMAGE_MCQ', 'ICON_MCQ']);
const FILE_UPLOAD_TYPES = new Set(['SIGNATURE', 'PHOTO_CAPTURE', 'VIDEO_CAPTURE']);
const AUTOCOMPLETE_TYPE = 'AUTOCOMPLETE';
const NPS_TYPE = 'NPS';
const NUMBER_TYPE = 'NUMBER';
const ANSWER_ROW_TYPE = 'ROW';
const ANSWER_COL_TYPE = 'COLUMN';
const CHILD_KEYS = ['children', 'groups', 'questions', 'answers'];

const round2 = (v: number): number => Math.round(v * 100) / 100;
const toValueKey = (f: ResponseField): string =>
  `${f.componentCode}.${String(f.columnName).toLowerCase()}`;

interface AnalyticsContext {
  labels: Record<string, string>;
  schemaMap: Record<string, ResponseField>;
  componentIndexList: Array<{ code: string; children?: string[] }>;
  questionTypes: Record<string, string>;
  answerTypes: Record<string, string>;
  resources: Record<string, string>;
  surveyId: string;
  responses: Array<Record<string, unknown>>;
}

/**
 * Per-question response analytics. Walks the processed design to learn each
 * question/answer type, then aggregates the
 * completed responses into per-type summaries (choice frequencies, matrix cells,
 * ranking, NPS, number stats, file presence, or raw values).
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly db: DbContext,
    private readonly design: DesignService,
    private readonly engine: EngineService,
  ) {}

  async getAnalytics(
    surveyId: string,
    maxResponses = DEFAULT_MAX_RESPONSES,
  ): Promise<AnalyticsDto> {
    const ctx = await this.buildContext(surveyId, maxResponses);
    const questions = ctx.componentIndexList
      .map((c) => c.code)
      .filter((code) => this.engine.isQuestionCode(code))
      .map((code) => this.buildAnalyticsQuestion(code, ctx))
      .filter((q): q is AnalyticsQuestion => q != null);

    const [counts] = await this.db.manager.query(
      `SELECT COUNT(CASE WHEN submit_date IS NOT NULL AND preview = false THEN 1 END) AS "completedCount",
              COUNT(CASE WHEN submit_date IS NULL AND preview = false THEN 1 END) AS "incompleteCount"
       FROM responses WHERE survey_id = $1`,
      [surveyId],
    );
    const completed = Number(counts.completedCount);
    const incomplete = Number(counts.incompleteCount);
    return { totalResponses: completed + incomplete, incompleteResponses: incomplete, questions };
  }

  private async buildContext(
    surveyId: string,
    maxResponses: number,
  ): Promise<AnalyticsContext> {
    const processed = await this.design.getProcessedSurvey(surveyId, false);
    const survey = processed.output.survey;
    const lang =
      (survey.defaultLang as { code?: string } | undefined)?.code ?? 'en';

    const rawLabels = this.engine.labels(survey, lang);
    const labels: Record<string, string> = {};
    for (const [code, value] of Object.entries(rawLabels)) {
      if (value !== '') labels[code] = stripTags(value); // filter non-empty, then strip
    }

    const schemaMap: Record<string, ResponseField> = {};
    for (const f of processed.output.schema) {
      if (String(f.columnName) === 'VALUE') schemaMap[f.componentCode] = f;
    }

    const { questionTypes, answerTypes, resources } = extractQuestionMetadata(
      survey,
      this.engine,
    );

    const rows: Array<{ values: string }> = await this.db.manager.query(
      `SELECT CAST("values" AS TEXT) AS values FROM responses
       WHERE survey_id = $1 AND submit_date IS NOT NULL AND preview = false
       ORDER BY survey_response_index ASC LIMIT $2`,
      [surveyId, maxResponses],
    );
    const responses = rows.map((r) => JSON.parse(r.values) as Record<string, unknown>);

    return {
      labels,
      schemaMap,
      componentIndexList: processed.output.componentIndexList,
      questionTypes,
      answerTypes,
      resources,
      surveyId,
      responses,
    };
  }

  private buildAnalyticsQuestion(
    questionCode: string,
    ctx: AnalyticsContext,
  ): AnalyticsQuestion | null {
    const responseField = ctx.schemaMap[questionCode];
    const questionType = ctx.questionTypes[questionCode];
    if (!questionType) return null;
    const title = ctx.labels[questionCode] ?? questionCode;

    const componentIndex = ctx.componentIndexList.find((c) => c.code === questionCode);
    const answerCodes = componentIndex?.children ?? [];

    const options = CHOICE_TYPES.has(questionType)
      ? toAnalyticsOptions(answerCodes, questionCode, ctx.labels)
      : null;

    const isMatrix = MATRIX_TYPES.has(questionType);
    const isRanking = RANKING_TYPES.has(questionType);
    let responseValues: unknown[];
    if (isRanking) {
      responseValues = extractRankingFromAnswerValues(ctx, answerCodes, questionCode);
    } else if (responseField) {
      responseValues = extractResponses(questionType, toValueKey(responseField), ctx);
    } else if (isMatrix) {
      responseValues = extractMatrixMultiFieldResponses(ctx, answerCodes, questionCode);
    } else {
      responseValues = extractMultiFieldResponses(ctx, answerCodes, questionCode);
    }

    const effectiveOptions =
      questionType === AUTOCOMPLETE_TYPE && options?.length === 0
        ? deriveOptionsFromResponses(responseValues)
        : options;

    const rows = isMatrix
      ? toAnalyticsOptions(answerCodes, questionCode, ctx.labels, (c) => ctx.answerTypes[c] === ANSWER_ROW_TYPE)
      : null;
    const columns = isMatrix
      ? toAnalyticsOptions(answerCodes, questionCode, ctx.labels, (c) => ctx.answerTypes[c] === ANSWER_COL_TYPE)
      : ICON_IMAGE_CHOICE_TYPES.has(questionType)
        ? toAnalyticsOptions(answerCodes, questionCode, ctx.labels)
        : null;

    const images = answerCodes
      .map((answerCode) => {
        const resourceFile = ctx.resources[answerCode];
        return resourceFile
          ? { id: answerCode, label: ctx.labels[answerCode], url: `/survey/${ctx.surveyId}/resource/${resourceFile}` }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    const fields =
      questionType === MULTIPLE_TEXT
        ? toAnalyticsOptions(answerCodes, questionCode, ctx.labels)
        : null;

    const base: AnalyticsQuestion = {
      id: questionCode,
      type: questionType,
      title,
      answeredCount: responseValues.length,
      options: effectiveOptions ?? undefined,
      rows: rows ?? undefined,
      columns: columns ?? undefined,
      images: images.length ? images : undefined,
      fields: fields ?? undefined,
    };

    if (questionType === NPS_TYPE) {
      return { ...base, npsSummary: aggregateNps(responseValues) };
    }
    if (questionType === NUMBER_TYPE) {
      const numberSummary = aggregateNumber(responseValues);
      return numberSummary ? { ...base, numberSummary } : base;
    }
    if (SINGLE_CHOICE_TYPES.has(questionType)) {
      return { ...base, frequencyCounts: aggregateFrequencyCounts(responseValues, effectiveOptions!, true) };
    }
    if (MULTI_CHOICE_TYPES.has(questionType)) {
      return { ...base, frequencyCounts: aggregateFrequencyCounts(responseValues, effectiveOptions!, false) };
    }
    if (RANKING_TYPES.has(questionType)) {
      return { ...base, rankingSummary: aggregateRanking(responseValues, effectiveOptions!) };
    }
    if (MATRIX_TYPES.has(questionType)) {
      return { ...base, matrixSummary: aggregateMatrix(responseValues, rows!, columns!, questionType) };
    }
    if (FILE_UPLOAD_TYPES.has(questionType)) {
      return {
        ...base,
        presenceCount: { presentCount: responseValues.length, totalResponses: ctx.responses.length },
      };
    }
    return { ...base, responses: responseValues };
  }
}

// --- tree traversal ---

function traverseSurveyTree(
  node: Record<string, unknown>,
  parentQuestionCode: string | null,
  engine: EngineService,
  visit: (n: Record<string, unknown>, code: string | null, parentQuestionCode: string | null) => void,
): void {
  const code = (node.code as string | undefined) ?? null;
  visit(node, code, parentQuestionCode);
  const currentQuestion = code && engine.isQuestionCode(code) ? code : parentQuestionCode;
  for (const key of CHILD_KEYS) {
    const children = node[key];
    if (Array.isArray(children)) {
      for (const child of children) {
        if (child && typeof child === 'object') {
          traverseSurveyTree(child as Record<string, unknown>, currentQuestion, engine, visit);
        }
      }
    }
  }
}

function extractQuestionMetadata(
  survey: Record<string, unknown>,
  engine: EngineService,
): { questionTypes: Record<string, string>; answerTypes: Record<string, string>; resources: Record<string, string> } {
  const questionTypes: Record<string, string> = {};
  const answerTypes: Record<string, string> = {};
  const resources: Record<string, string> = {};
  traverseSurveyTree(survey, null, engine, (node, code, parentQuestionCode) => {
    if (code && engine.isQuestionCode(code)) {
      const type = node.type as string | undefined;
      if (type) questionTypes[code] = type.toUpperCase();
    }
    if (code && engine.isAnswerCode(code) && parentQuestionCode) {
      const path = resolveContentPath(node);
      if (path) resources[parentQuestionCode + code] = path;
      const type = node.type as string | undefined;
      if (type) answerTypes[parentQuestionCode + code] = type.toUpperCase();
    }
  });
  return { questionTypes, answerTypes, resources };
}

function resolveContentPath(node: Record<string, unknown>): string | null {
  const res = node.resources as { icon?: string; image?: string } | undefined;
  if (!res || typeof res !== 'object') return null;
  return res.icon ?? res.image ?? null;
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// --- options ---

function toAnalyticsOptions(
  answerCodes: string[],
  questionCode: string,
  labels: Record<string, string>,
  filter?: (code: string) => boolean,
): AnalyticsOption[] {
  const codes = filter ? answerCodes.filter(filter) : answerCodes;
  return codes.map((fullCode) => {
    const stripped = fullCode.startsWith(questionCode)
      ? fullCode.slice(questionCode.length)
      : fullCode;
    return { code: stripped, label: labels[fullCode] ?? stripped };
  });
}

function deriveOptionsFromResponses(responseValues: unknown[]): AnalyticsOption[] {
  return [
    ...new Set(
      responseValues
        .map((v) => (v == null ? null : String(v)))
        .filter((v): v is string => v != null && v.trim() !== ''),
    ),
  ]
    .sort()
    .map((v) => ({ code: v, label: v }));
}

// --- response extraction ---

function extractResponses(
  type: string,
  valueKey: string,
  ctx: AnalyticsContext,
): unknown[] {
  const out: unknown[] = [];
  for (const response of ctx.responses) {
    const value = response[valueKey];
    if (value == null || isEmptyValue(value)) continue;
    if (SINGLE_CHOICE_TYPES.has(type)) {
      out.push(String(value));
    } else if (MULTI_CHOICE_TYPES.has(type)) {
      if (Array.isArray(value)) out.push(value.map((v) => String(v)));
    } else if (FILE_UPLOAD_TYPES.has(type)) {
      out.push(true);
    } else {
      out.push(value);
    }
  }
  return out;
}

function extractMatrixMultiFieldResponses(
  ctx: AnalyticsContext,
  answerCodes: string[],
  questionCode: string,
): unknown[] {
  const rowCodes = answerCodes.filter((c) => ctx.answerTypes[c] === ANSWER_ROW_TYPE);
  const out: unknown[] = [];
  for (const response of ctx.responses) {
    const fieldMap: Record<string, unknown> = {};
    for (const answerCode of rowCodes) {
      const field = ctx.schemaMap[answerCode];
      if (!field) continue;
      const value = response[toValueKey(field)];
      if (value == null || isEmptyValue(value)) continue;
      fieldMap[answerCode.slice(questionCode.length)] = value;
    }
    if (Object.keys(fieldMap).length) out.push(fieldMap);
  }
  return out;
}

function extractRankingFromAnswerValues(
  ctx: AnalyticsContext,
  answerCodes: string[],
  questionCode: string,
): unknown[] {
  const out: unknown[] = [];
  for (const response of ctx.responses) {
    const rankedItems: Array<[number, string]> = [];
    for (const answerCode of answerCodes) {
      const field = ctx.schemaMap[answerCode];
      if (!field) continue;
      const value = response[toValueKey(field)];
      let rank: number | null = null;
      if (typeof value === 'number') rank = Math.trunc(value);
      else if (typeof value === 'string') {
        const n = parseInt(value, 10);
        rank = Number.isNaN(n) ? null : n;
      }
      if (rank == null) continue;
      rankedItems.push([rank, answerCode.slice(questionCode.length)]);
    }
    if (rankedItems.length) {
      out.push(rankedItems.sort((a, b) => a[0] - b[0]).map((x) => x[1]));
    }
  }
  return out;
}

function extractMultiFieldResponses(
  ctx: AnalyticsContext,
  answerCodes: string[],
  questionCode: string,
): unknown[] {
  const out: unknown[] = [];
  for (const response of ctx.responses) {
    const fieldMap: Record<string, unknown> = {};
    for (const answerCode of answerCodes) {
      const field = ctx.schemaMap[answerCode];
      if (!field) continue;
      const value = response[toValueKey(field)];
      if (value == null || isEmptyValue(value)) continue;
      fieldMap[answerCode.slice(questionCode.length)] = value;
    }
    if (Object.keys(fieldMap).length) out.push(fieldMap);
  }
  return out;
}

// --- aggregation ---

function aggregateFrequencyCounts(
  responses: unknown[],
  options: AnalyticsOption[],
  isSingleChoice: boolean,
): FrequencyCount[] {
  const counts = new Map<string, number>(options.map((o) => [o.code, 0]));
  for (const value of responses) {
    if (isSingleChoice) {
      if (value == null) continue;
      const code = String(value);
      counts.set(code, (counts.get(code) ?? 0) + 1);
    } else {
      if (!Array.isArray(value)) continue;
      for (const code of value) {
        if (code == null) continue;
        const key = String(code);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return options.map((o) => ({ code: o.code, count: counts.get(o.code) ?? 0 }));
}

function aggregateNps(responses: unknown[]): NpsSummary {
  const numbers = responses.filter((v): v is number => typeof v === 'number').map(Math.trunc);
  const detractors = numbers.filter((n) => n >= 0 && n <= 6).length;
  const passives = numbers.filter((n) => n >= 7 && n <= 8).length;
  const promoters = numbers.filter((n) => n >= 9 && n <= 10).length;
  const total = numbers.length;
  const score = total > 0 ? ((promoters - detractors) / total) * 100 : 0;
  const distribution = new Array<number>(11).fill(0);
  for (const n of numbers) if (n >= 0 && n <= 10) distribution[n]++;
  return { detractors, passives, promoters, score, answeredCount: total, distribution };
}

function median(sorted: number[]): number {
  const n = sorted.length;
  return n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
}

function aggregateNumber(responses: unknown[]): NumberSummary | null {
  const numbers = responses.filter((v): v is number => typeof v === 'number');
  if (!numbers.length) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const count = sorted.length;
  const mean = numbers.reduce((a, b) => a + b, 0) / count;
  const variance = numbers.reduce((a, b) => a + (b - mean) * (b - mean), 0) / count;
  const stdDev = Math.sqrt(variance);

  const freq = new Map<number, number>();
  for (const n of numbers) freq.set(n, (freq.get(n) ?? 0) + 1);
  const frequencyTable = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, c]) => ({ value, count: c }));

  let outlierValues: number[] = [];
  if (count >= 4) {
    const mid = Math.floor(count / 2);
    const q1Arr = sorted.slice(0, mid);
    const q3Arr = count % 2 !== 0 ? sorted.slice(mid + 1) : sorted.slice(mid);
    const q1 = median(q1Arr);
    const q3 = median(q3Arr);
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    outlierValues = numbers.filter((n) => n < lower || n > upper);
  }

  return {
    min: sorted[0],
    max: sorted[count - 1],
    mean: round2(mean),
    median: round2(median(sorted)),
    sum: round2(numbers.reduce((a, b) => a + b, 0)),
    count,
    stdDev: round2(stdDev),
    frequencyTable,
    outlierValues,
    outliersCount: outlierValues.length,
  };
}

function aggregateRanking(
  responses: unknown[],
  options: AnalyticsOption[],
): RankingSummaryItem[] {
  const rankLists = new Map<string, number[]>(options.map((o) => [o.code, []]));
  const firstPlace = new Map<string, number>(options.map((o) => [o.code, 0]));
  const lastPlace = new Map<string, number>(options.map((o) => [o.code, 0]));
  for (const value of responses) {
    if (!Array.isArray(value)) continue;
    value.forEach((code, index) => {
      if (code == null) return;
      const key = String(code);
      rankLists.get(key)?.push(index + 1);
      if (index === 0) firstPlace.set(key, (firstPlace.get(key) ?? 0) + 1);
      if (index === value.length - 1) lastPlace.set(key, (lastPlace.get(key) ?? 0) + 1);
    });
  }
  return options.map((o) => {
    const ranks = rankLists.get(o.code) ?? [];
    const avg = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0;
    return {
      code: o.code,
      averageRank: ranks.length ? round2(avg) : 0,
      responseCount: ranks.length,
      firstPlaceCount: firstPlace.get(o.code) ?? 0,
      lastPlaceCount: lastPlace.get(o.code) ?? 0,
    };
  });
}

export function aggregateMatrix(
  responses: unknown[],
  rows: AnalyticsOption[],
  columns: AnalyticsOption[],
  questionType: string,
): MatrixSummaryItem[] {
  const counts = new Map<string, number>();
  // Composite (row, column) key. The separator is NUL (\u0000) — a character
  // that cannot appear in a stored code/value — so distinct pairs never collide
  // and splitting back is safe even when a cell value contains a space (an
  // "other" free-text column, or an imported value like "New York"). Written as
  // a visible escape, not a raw NUL byte, so it doesn't read as a space bug.
  const key = (r: string, c: string) => `${r}\u0000${c}`;
  for (const row of rows) for (const col of columns) counts.set(key(row.code, col.code), 0);

  const isMultiChoice = questionType === MCQ_ARRAY;
  for (const value of responses) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    for (const [rowCode, colValue] of Object.entries(value as Record<string, unknown>)) {
      if (isMultiChoice) {
        if (!Array.isArray(colValue)) continue;
        for (const col of colValue) {
          if (col == null) continue;
          const k = key(rowCode, String(col));
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
      } else {
        if (colValue == null) continue;
        const k = key(rowCode, String(colValue));
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()].map(([k, count]) => {
    const [rowCode, columnCode] = k.split('\u0000');
    return { rowCode, columnCode, count };
  });
}
