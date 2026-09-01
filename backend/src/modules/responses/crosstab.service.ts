import { BadRequestException, Injectable } from '@nestjs/common';
import { DbContext } from '../../database/db-context';
import { EngineService } from '../../engine/engine.service';
import { DesignService } from '../design/design.service';
import {
  ANSWER_COL_TYPE,
  ANSWER_ROW_TYPE,
  AnalyticsContext,
  buildAnalyticsContext,
  DEFAULT_MAX_RESPONSES,
  MATRIX_TYPES,
  MCQ_ARRAY,
  MULTI_CHOICE_TYPES,
  NPS_TYPE,
  SINGLE_CHOICE_TYPES,
  toAnalyticsOptions,
  toValueKey,
} from './analytics.service';
import {
  CrosstabCatalogueDto,
  CrosstabCategory,
  CrosstabCell,
  CrosstabRequestDto,
  CrosstabResultDto,
  CrosstabWarning,
  CrosstabWeighting,
} from './crosstab.dto';

// --- tuning constants (ported from the prototype) ---
/** Below this unweighted answered count, a column's %/tests are suppressed. */
const SUPPRESS_BASE = 30;
/** Between SUPPRESS_BASE and this, a column is flagged "read with care". */
const CAUTION_BASE = 100;
/** Two-proportion z critical value at 95%. */
const Z_95 = 1.96;
/** Below this weighting efficiency, a small group starts driving the report. */
const MIN_EFFICIENCY = 0.6;
/** Weights above this usually mean the target is unrealistic for the sample. */
const MAX_WEIGHT = 5;

const NPS_BUCKETS: CrosstabCategory[] = [
  { code: 'detractors', label: 'Detractors (0–6)' },
  { code: 'passives', label: 'Passives (7–8)' },
  { code: 'promoters', label: 'Promoters (9–10)' },
];
export const npsBucket = (n: number): string =>
  n <= 6 ? 'detractors' : n <= 8 ? 'passives' : 'promoters';

const round2 = (v: number): number => Math.round(v * 100) / 100;
const round4 = (v: number): number => Math.round(v * 10000) / 10000;
const letterFor = (i: number): string =>
  i < 26 ? String.fromCharCode(65 + i) : `C${i + 1}`;

// --- pure stats core (unit-tested directly, no DI) ---

/** One respondent, already resolved to category codes. */
export interface CrosstabRecord {
  /** Resolved column (banner) category, or null when unanswered. */
  col: string | null;
  /** Resolved row categories: 0 (unanswered), 1 (single), or many (multi). */
  rows: string[];
  /** Resolved weight category, or null when the weight var is unanswered. */
  weight: string | null;
}

export interface CrosstabComputeInput {
  records: CrosstabRecord[];
  rowCodes: string[];
  colCodes: string[];
  multi: boolean;
  /** Weight variable's category codes (in order); null/absent → unweighted. */
  weightCodes?: string[] | null;
  /** Weight targets by category code (percentages). */
  targets?: Record<string, number> | null;
  options?: { counts?: boolean; pct?: boolean; significance?: boolean };
}

export interface CrosstabComputeResult {
  multi: boolean;
  columns: Array<{
    code: string;
    letter: string;
    base: number;
    effectiveBase: number;
    lowBase: boolean;
  }>;
  rows: Array<{ code: string; cells: CrosstabCell[] }>;
  notAnswered: number;
  weighting?: CrosstabWeighting;
  warnings: CrosstabWarning[];
}

/** Two-proportion z, using the (effective) bases as n. Mirrors the prototype. */
export function zTest(p1: number, n1: number, p2: number, n2: number): number {
  if (n1 < SUPPRESS_BASE || n2 < SUPPRESS_BASE) return 0;
  const pp = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
  return se === 0 ? 0 : (p1 - p2) / se;
}

/**
 * Build one crosstab table: weighted cell counts, column %s, letter-based
 * significance, effective base, efficiency, and warnings. Pure — the caller
 * resolves respondents to category codes first (see `tabulate`).
 */
export function computeCrosstab(
  input: CrosstabComputeInput,
): CrosstabComputeResult {
  const { records, rowCodes, colCodes, multi } = input;
  const options = input.options ?? { counts: true, pct: true, significance: true };
  const weighted = !!(
    input.weightCodes &&
    input.weightCodes.length &&
    input.targets
  );

  // --- single-variable post-stratification weights ---
  const weightMap: Record<string, number> = {};
  const weightCount: Record<string, number> = {};
  const weightShare: Record<string, number> = {};
  let targetSum = 0;
  let maxWeight = 0;
  if (weighted) {
    const codes = input.weightCodes as string[];
    const targets = input.targets as Record<string, number>;
    targetSum = codes.reduce((s, c) => s + (targets[c] ?? 0), 0);
    const denom = records.filter((r) => r.weight != null).length || 1;
    for (const c of codes) {
      const count = records.filter((r) => r.weight === c).length;
      const share = count / denom;
      const tgt = (targets[c] ?? 0) / (targetSum || 1);
      weightCount[c] = count;
      weightShare[c] = share;
      weightMap[c] = share > 0 ? tgt / share : 0;
      if (weightMap[c] > maxWeight) maxWeight = weightMap[c];
    }
  }
  const weightOf = (r: CrosstabRecord): number =>
    weighted ? (r.weight != null ? weightMap[r.weight] ?? 0 : 0) : 1;

  // --- accumulate ---
  const colSet = new Set(colCodes);
  const rowSet = new Set(rowCodes);
  const colBaseW: Record<string, number> = {};
  const colBaseW2: Record<string, number> = {};
  const colN: Record<string, number> = {};
  for (const c of colCodes) {
    colBaseW[c] = 0;
    colBaseW2[c] = 0;
    colN[c] = 0;
  }
  const cellW: Record<string, number> = {};
  // NUL separator (cannot appear in a stored code/value) so (row, col) pairs
  // never collide -- matches aggregateMatrix keying.
  const cellKey = (r: string, c: string) => `${r}\u0000${c}`;
  for (const r of rowCodes) for (const c of colCodes) cellW[cellKey(r, c)] = 0;

  let notAnswered = 0;
  let droppedNoWeight = 0;
  for (const rec of records) {
    const c = rec.col;
    if (c == null || !colSet.has(c)) continue;
    const w = weightOf(rec);
    if (weighted && w === 0) {
      droppedNoWeight++; // in a valid column but no usable weight → excluded
      continue;
    }
    const picked = rec.rows.filter((rc) => rowSet.has(rc));
    if (picked.length === 0) {
      notAnswered++;
      continue;
    }
    colBaseW[c] += w;
    colBaseW2[c] += w * w;
    colN[c] += 1;
    const uniq = multi ? [...new Set(picked)] : [picked[0]];
    for (const rc of uniq) cellW[cellKey(rc, c)] += w;
  }

  const effBase: Record<string, number> = {};
  for (const c of colCodes) {
    effBase[c] =
      colBaseW2[c] > 0 ? (colBaseW[c] * colBaseW[c]) / colBaseW2[c] : 0;
  }

  const letters = colCodes.map((_, i) => letterFor(i));
  const pctOf = (r: string, c: string): number =>
    colBaseW[c] > 0 ? cellW[cellKey(r, c)] / colBaseW[c] : 0;

  const columns = colCodes.map((c, i) => ({
    code: c,
    letter: letters[i],
    base: Math.round(colBaseW[c]),
    effectiveBase: Math.round(effBase[c]),
    lowBase: colN[c] < SUPPRESS_BASE,
  }));

  const rows = rowCodes.map((r) => ({
    code: r,
    cells: colCodes.map((c, i): CrosstabCell => {
      const p = pctOf(r, c);
      let beats: string[] = [];
      if (options.significance && colN[c] >= SUPPRESS_BASE) {
        beats = colCodes
          .map((c2, j) =>
            j !== i &&
            colN[c2] >= SUPPRESS_BASE &&
            zTest(p, effBase[c], pctOf(r, c2), effBase[c2]) > Z_95
              ? letters[j]
              : null,
          )
          .filter((x): x is string => x != null);
      }
      return { count: Math.round(cellW[cellKey(r, c)]), pct: round4(p), beats };
    }),
  }));

  // --- weighting summary ---
  let weighting: CrosstabWeighting | undefined;
  if (weighted) {
    const weightedBase = colCodes.reduce((s, c) => s + colBaseW[c], 0);
    const effTotal = colCodes.reduce((s, c) => s + effBase[c], 0);
    const totalN = colCodes.reduce((s, c) => s + colN[c], 0);
    weighting = {
      weightedBase: Math.round(weightedBase),
      effectiveBase: Math.round(effTotal),
      efficiency: totalN > 0 ? round4(effTotal / totalN) : 0,
      maxWeight: round2(maxWeight),
      targetSum: round2(targetSum),
      droppedNoWeight,
      categories: (input.weightCodes as string[]).map((c) => ({
        code: c,
        count: weightCount[c] ?? 0,
        share: round4(weightShare[c] ?? 0),
        weight: round2(weightMap[c] ?? 0),
      })),
    };
  }

  // --- warnings (structured; frontend localizes by code) ---
  const warnings: CrosstabWarning[] = [];
  if (weighted && Math.abs(targetSum - 100) > 0.5) {
    warnings.push({ code: 'targetSum', params: { sum: round2(targetSum) } });
  }
  const lowCols = colCodes.filter((c) => colN[c] < SUPPRESS_BASE);
  if (lowCols.length) {
    warnings.push({
      code: 'lowBase',
      params: { count: lowCols.length, total: colCodes.length },
    });
  }
  const thinCols = colCodes.filter(
    (c) => colN[c] >= SUPPRESS_BASE && colN[c] < CAUTION_BASE,
  );
  if (thinCols.length) {
    warnings.push({ code: 'thinColumns', params: { count: thinCols.length } });
  }
  if (weighting) {
    if (weighting.efficiency < MIN_EFFICIENCY) {
      warnings.push({
        code: 'lowEfficiency',
        params: { efficiency: Math.round(weighting.efficiency * 100) },
      });
    }
    if (weighting.maxWeight > MAX_WEIGHT) {
      warnings.push({ code: 'highWeight', params: { maxWeight: weighting.maxWeight } });
    }
    if (droppedNoWeight > 0) {
      warnings.push({ code: 'droppedWeight', params: { count: droppedNoWeight } });
    }
  }

  return { multi, columns, rows, notAnswered, weighting, warnings };
}

// --- variable definitions (design → what can be crossed) ---

export type VarKind = 'single' | 'multi' | 'nps';

export interface VarDef {
  /** Question code, or a matrix sub-row answer code. */
  id: string;
  label: string;
  kind: VarKind;
  multi: boolean;
  categories: CrosstabCategory[];
  /** Response `values` key holding this variable's answer. */
  valueKey: string;
}

interface VarDefs {
  rowDefs: Map<string, VarDef>;
  colDefs: Map<string, VarDef>;
}

/**
 * Walk the processed design and produce the row superset (single-choice,
 * multi-choice, NPS buckets, matrix sub-rows) and the strict single-choice
 * column set. A single-choice question yields the same def in both maps.
 */
export function buildVarDefs(
  ctx: AnalyticsContext,
  engine: EngineService,
): VarDefs {
  const rowDefs = new Map<string, VarDef>();
  const colDefs = new Map<string, VarDef>();
  for (const ci of ctx.componentIndexList) {
    const code = ci.code;
    if (!engine.isQuestionCode(code)) continue;
    const type = ctx.questionTypes[code];
    if (!type) continue;
    const answerCodes = (ci.children as string[] | undefined) ?? [];
    const field = ctx.schemaMap[code];
    const label = ctx.labels[code] ?? code;
    const valueKey = field ? toValueKey(field) : `${code}.value`;

    if (SINGLE_CHOICE_TYPES.has(type)) {
      const categories = toAnalyticsOptions(answerCodes, code, ctx.labels);
      if (categories.length < 2) continue;
      const def: VarDef = { id: code, label, kind: 'single', multi: false, categories, valueKey };
      rowDefs.set(code, def);
      colDefs.set(code, def);
    } else if (MULTI_CHOICE_TYPES.has(type)) {
      const categories = toAnalyticsOptions(answerCodes, code, ctx.labels);
      if (categories.length < 2) continue;
      rowDefs.set(code, { id: code, label, kind: 'multi', multi: true, categories, valueKey });
    } else if (type === NPS_TYPE) {
      rowDefs.set(code, { id: code, label, kind: 'nps', multi: false, categories: NPS_BUCKETS, valueKey });
    } else if (MATRIX_TYPES.has(type)) {
      const rowAnswerCodes = answerCodes.filter(
        (c) => ctx.answerTypes[c] === ANSWER_ROW_TYPE,
      );
      const categories = toAnalyticsOptions(
        answerCodes,
        code,
        ctx.labels,
        (c) => ctx.answerTypes[c] === ANSWER_COL_TYPE,
      );
      if (categories.length < 2) continue;
      const isMulti = type === MCQ_ARRAY;
      for (const rc of rowAnswerCodes) {
        const rField = ctx.schemaMap[rc];
        if (!rField) continue;
        rowDefs.set(rc, {
          id: rc,
          label: `${label} – ${ctx.labels[rc] ?? rc}`,
          kind: isMulti ? 'multi' : 'single',
          multi: isMulti,
          categories,
          valueKey: toValueKey(rField),
        });
      }
    }
  }
  return { rowDefs, colDefs };
}

function resolveSingle(
  def: VarDef,
  resp: Record<string, unknown>,
): string | null {
  const v = resp[def.valueKey];
  if (v == null || Array.isArray(v)) return null;
  const s = String(v);
  return s.trim() === '' ? null : s;
}

export function resolveRows(
  def: VarDef,
  resp: Record<string, unknown>,
): string[] {
  const v = resp[def.valueKey];
  if (v == null) return [];
  if (def.kind === 'multi') {
    return Array.isArray(v)
      ? v.filter((x) => x != null).map((x) => String(x))
      : [];
  }
  if (def.kind === 'nps') {
    const n =
      typeof v === 'number'
        ? v
        : typeof v === 'string' && v.trim() !== ''
          ? Number(v)
          : NaN;
    return Number.isFinite(n) ? [npsBucket(n)] : [];
  }
  if (Array.isArray(v)) return [];
  const s = String(v);
  return s.trim() === '' ? [] : [s];
}

/**
 * Cross-tabulation over stored survey responses. The banner (columns) is
 * strictly single-choice; rows are the relaxed superset. All aggregation,
 * weighting, and significance run here — the server returns only the finished
 * table.
 */
@Injectable()
export class CrosstabService {
  constructor(
    private readonly db: DbContext,
    private readonly design: DesignService,
    private readonly engine: EngineService,
  ) {}

  /** The eligible row/column variables — no respondent data. */
  async getCatalogue(surveyId: string): Promise<CrosstabCatalogueDto> {
    const ctx = await buildAnalyticsContext(
      this.design,
      this.engine,
      this.db,
      surveyId,
      0,
      false, // catalogue needs the design only, not the responses
    );
    const { rowDefs, colDefs } = buildVarDefs(ctx, this.engine);
    const totalResponses = await this.countCompleted(surveyId);
    return {
      totalResponses,
      rowVariables: [...rowDefs.values()].map((d) => ({
        id: d.id,
        label: d.label,
        multi: d.multi,
        categories: d.categories,
      })),
      colVariables: [...colDefs.values()].map((d) => ({
        code: d.id,
        label: d.label,
        categories: d.categories,
      })),
    };
  }

  /** Compute one crosstab table for the given config. */
  async tabulate(
    surveyId: string,
    config: CrosstabRequestDto,
  ): Promise<CrosstabResultDto> {
    // `config` is a plain interface (no ValidationPipe coverage), so guard the
    // numeric inputs here: clamp the row cap to a sane range and reject weight
    // targets that would produce nonsensical (e.g. negative) post-strat weights.
    const maxResponses = Math.min(
      Math.max(1, Math.trunc(config.maxResponses ?? DEFAULT_MAX_RESPONSES)),
      DEFAULT_MAX_RESPONSES,
    );
    if (config.targets) {
      for (const [code, value] of Object.entries(config.targets)) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
          throw new BadRequestException(`Invalid weight target for ${code}`);
        }
      }
    }
    const ctx = await buildAnalyticsContext(
      this.design,
      this.engine,
      this.db,
      surveyId,
      maxResponses,
    );
    const { rowDefs, colDefs } = buildVarDefs(ctx, this.engine);

    const rowDef = rowDefs.get(config.rowVar);
    if (!rowDef) {
      throw new BadRequestException(`Unknown row variable: ${config.rowVar}`);
    }
    const colDef = colDefs.get(config.colVar);
    if (!colDef) {
      throw new BadRequestException(`Unknown column variable: ${config.colVar}`);
    }
    if (rowDef.id === colDef.id) {
      throw new BadRequestException('Row and column must be different variables');
    }
    let weightDef: VarDef | undefined;
    if (config.weightVar) {
      weightDef = colDefs.get(config.weightVar);
      if (!weightDef) {
        throw new BadRequestException(
          `Unknown weight variable: ${config.weightVar}`,
        );
      }
    }

    const records: CrosstabRecord[] = ctx.responses.map((resp) => ({
      col: resolveSingle(colDef, resp),
      rows: resolveRows(rowDef, resp),
      weight: weightDef ? resolveSingle(weightDef, resp) : null,
    }));

    const result = computeCrosstab({
      records,
      rowCodes: rowDef.categories.map((c) => c.code),
      colCodes: colDef.categories.map((c) => c.code),
      multi: rowDef.multi,
      weightCodes: weightDef ? weightDef.categories.map((c) => c.code) : null,
      targets: config.targets ?? null,
      options: config.options,
    });

    // The context loads at most `maxResponses` rows; if more completed responses
    // exist, the table is a first-N sample — surface that so the stats aren't
    // read as the whole population.
    const warnings = [...result.warnings];
    const totalCompleted = await this.countCompleted(surveyId);
    if (ctx.responses.length < totalCompleted) {
      warnings.push({
        code: 'truncated',
        params: { shown: ctx.responses.length, total: totalCompleted },
      });
    }

    const rowLabels = new Map(rowDef.categories.map((c) => [c.code, c.label]));
    const colLabels = new Map(colDef.categories.map((c) => [c.code, c.label]));
    return {
      multi: result.multi,
      columns: result.columns.map((c) => ({
        ...c,
        label: colLabels.get(c.code) ?? c.code,
      })),
      rows: result.rows.map((r) => ({
        code: r.code,
        label: rowLabels.get(r.code) ?? r.code,
        cells: r.cells,
      })),
      notAnswered: result.notAnswered,
      weighting: result.weighting,
      warnings,
    };
  }

  private async countCompleted(surveyId: string): Promise<number> {
    const [row] = await this.db.manager.query(
      `SELECT COUNT(*) AS c FROM responses
       WHERE survey_id = $1 AND submit_date IS NOT NULL AND preview = false`,
      [surveyId],
    );
    return Number(row.c);
  }
}
