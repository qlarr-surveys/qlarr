/**
 * Crosstab DTOs. The banner (columns) is strictly single-choice so each
 * respondent lands in exactly one column — that mutual exclusivity is what makes
 * column percentages and the significance test valid. Rows are the relaxed
 * superset (single-choice, multi-choice, NPS buckets, matrix sub-rows) and may
 * put a respondent in zero, one, or many row categories.
 *
 * Request bodies are classes so the global ValidationPipe (whitelist + transform)
 * enforces their shape and strips unknown fields; response shapes stay interfaces.
 */
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export interface CrosstabCategory {
  code: string;
  label: string;
}

/** Banner variable: respondent → exactly one category. Single-choice only. */
export interface CrosstabColumnVariable {
  code: string;
  label: string;
  categories: CrosstabCategory[];
}

/** Row variable: respondent → zero / one / many categories, per `multi`. */
export interface CrosstabRowVariable {
  /** Opaque handle passed back as `rowVar` (question code or matrix-row code). */
  id: string;
  label: string;
  /** true → a respondent may fall in >1 row (MCQ/MCQ_ARRAY); column %s can exceed 100. */
  multi: boolean;
  categories: CrosstabCategory[];
}

export interface CrosstabCatalogueDto {
  totalResponses: number;
  rowVariables: CrosstabRowVariable[];
  colVariables: CrosstabColumnVariable[];
}

/** Which numbers to show per cell — display toggles, all default on. */
export class CrosstabOptions {
  @IsOptional() @IsBoolean() counts?: boolean;
  @IsOptional() @IsBoolean() pct?: boolean;
  @IsOptional() @IsBoolean() significance?: boolean;
}

export class CrosstabRequestDto {
  /** A CrosstabRowVariable.id. */
  @IsString() @IsNotEmpty() rowVar: string;
  /** A CrosstabColumnVariable.code (the banner). */
  @IsString() @IsNotEmpty() colVar: string;
  /** A CrosstabColumnVariable.code (optional post-stratification weight). */
  @IsOptional() @IsString() weightVar?: string;
  /**
   * Weight targets by category code (percentages, ~100 total). Keys are dynamic
   * category codes, so the pipe only checks it is an object — the service rejects
   * negative / non-finite values (see CrosstabService.tabulate).
   */
  @IsOptional() @IsObject() targets?: Record<string, number>;
  @IsOptional()
  @ValidateNested()
  @Type(() => CrosstabOptions)
  options?: CrosstabOptions;
  /** Row cap; the service clamps it to [1, DEFAULT_MAX_RESPONSES]. */
  @IsOptional() @IsInt() @Min(1) maxResponses?: number;
}

export interface CrosstabColumnResult {
  code: string;
  label: string;
  /** Significance letter (A, B, C, …) identifying this column. */
  letter: string;
  /** Weighted base (respondents in this column who answered the row question). */
  base: number;
  /** Effective base under weighting: (Σw)² / Σw². Equals `base` when unweighted. */
  effectiveBase: number;
  /** true when the unweighted answered count is under the suppression threshold. */
  lowBase: boolean;
}

export interface CrosstabCell {
  /** Weighted count in this (row, column) cell, rounded. */
  count: number;
  /** Column proportion (0..1): cell weight ÷ column base. */
  pct: number;
  /** Letters of the columns this cell is significantly higher than (95%). */
  beats: string[];
}

export interface CrosstabRowResult {
  code: string;
  label: string;
  /** One cell per column, aligned to `columns`. */
  cells: CrosstabCell[];
}

/** Observed vs. applied breakdown for one weight category (UI reference). */
export interface CrosstabWeightCategory {
  /** Weight category code (matches a colVariable category). */
  code: string;
  /** Observed unweighted respondents in this category. */
  count: number;
  /** Observed proportion of the weighted base (0..1). */
  share: number;
  /** Post-stratification weight applied to this category. */
  weight: number;
}

export interface CrosstabWeighting {
  weightedBase: number;
  effectiveBase: number;
  /** effectiveBase / answered count, 0..1. */
  efficiency: number;
  /** Largest post-stratification weight applied. */
  maxWeight: number;
  /** Sum of the supplied targets (flagged when it isn't ~100). */
  targetSum: number;
  /** Respondents excluded from the weighted table for having no weight answer. */
  droppedNoWeight: number;
  /** Per-category observed count/share and the weight applied to it. */
  categories: CrosstabWeightCategory[];
}

/** A localizable warning: the frontend maps `code` → a translated message. */
export interface CrosstabWarning {
  code: string;
  params?: Record<string, number>;
}

export interface CrosstabResultDto {
  /** Echoes the row variable's multi flag → UI can note column %s may exceed 100. */
  multi: boolean;
  columns: CrosstabColumnResult[];
  rows: CrosstabRowResult[];
  /** Respondents in a valid column who did not answer the row question. */
  notAnswered: number;
  weighting?: CrosstabWeighting;
  warnings: CrosstabWarning[];
}
