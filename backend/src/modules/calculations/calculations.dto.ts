/**
 * Calculated-fields DTOs. Request bodies are classes so the global
 * ValidationPipe (whitelist + transform) enforces their shape and strips
 * unknown fields (including any `errors` a client sends); response shapes stay
 * interfaces.
 */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CalcRuntimeError, Calculation } from '../../engine/engine.types';
import { MAX_CALCULATIONS, MAX_EXPRESSION_LENGTH } from './calculations.constants';
import { CalculationStatus } from './survey-calculations.entity';

/** One calculation as authored. Code rules are the engine's to check. */
export class CalculationInput {
  @IsString()
  code: string;

  @IsString()
  label: string;

  @IsString()
  @MaxLength(MAX_EXPRESSION_LENGTH)
  expression: string;
}

/** `PUT survey/:surveyId/calculations` */
export class SaveCalculationsRequest {
  @IsArray()
  @ArrayMaxSize(MAX_CALCULATIONS)
  @ValidateNested({ each: true })
  @Type(() => CalculationInput)
  calculations: CalculationInput[];

  /** The revision the editor loaded; a stale one gets 409. */
  @IsInt()
  @Min(0)
  revision: number;
}

/** The tab's view of a survey's calculations and its Compute run. */
export interface CalculationsStateDto {
  /** The stored set, each calculation with its validation `errors`. */
  calculations: Calculation[];
  revision: number;
  status: CalculationStatus;
  progress: { done: number; total: number };
  startedAt: string | null;
  /**
   * Only when `status = completed`: completed responses submitted since the
   * last run (they show "not computed"). Null for every other status.
   */
  newSinceLastRun: number | null;
}

/** One response in a Test dry run. */
export interface CalculationSampleRow {
  responseId: string;
  index: number | null;
  preview: boolean;
  results: Record<string, unknown>;
  errors: Record<string, CalcRuntimeError>;
}

export interface TestCalculationsResponse {
  sample: CalculationSampleRow[];
}
