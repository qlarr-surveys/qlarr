import { Injectable } from '@nestjs/common';
import { DbContext } from '../../database/db-context';
import { EngineService } from '../../engine/engine.service';
import { Calculation } from '../../engine/engine.types';
import { JobsService } from '../../jobs/jobs.service';
import { DesignService } from '../design/design.service';
import { SurveyNotFoundException } from '../surveys/survey.exceptions';
import { CalcComputeHandler } from './calc-compute.handler';
import { CALC_COMPUTE, SAMPLE_SIZE } from './calculations.constants';
import {
  CalculationInput,
  CalculationSampleRow,
  CalculationsStateDto,
  TestCalculationsResponse,
} from './calculations.dto';
import { NoCalculationsException } from './calculations.exceptions';
import { CalculationsRepository } from './calculations.repository';

/**
 * Calculated fields: authoring (validate, test, save) and starting Compute,
 * which runs as a job (`CalcComputeHandler`).
 *
 * Validation runs only on Save and import, and the whole validated set is
 * stored, each calculation with its `errors`. Test and Compute pass the stored
 * set to the engine as it is; the engine never runs a calculation with errors.
 * A design change marks every calculation `OutOfDate`, so they stop running
 * until the next Save.
 * Everything runs against the survey's latest version. A Save or a design
 * change deletes the results and cancels the Compute, so any results that
 * exist are valid.
 */
@Injectable()
export class CalculationsService {
  constructor(
    private readonly db: DbContext,
    private readonly calculations: CalculationsRepository,
    private readonly computeJob: CalcComputeHandler,
    private readonly jobs: JobsService,
    private readonly design: DesignService,
    private readonly engine: EngineService,
  ) {}

  async getState(surveyId: string): Promise<CalculationsStateDto> {
    const row = await this.currentRow(surveyId);
    return {
      calculations: row?.calculations ?? [],
      revision: row?.revision ?? 0,
      ...(await this.jobs.status(CALC_COMPUTE, surveyId, '')),
      uncomputedCount: await this.calculations.countWithoutComputations(surveyId),
    };
  }

  /**
   * Evaluate the saved set, as stored, on the sample. No validation (the set
   * was validated when saved) and nothing is stored.
   */
  async test(surveyId: string): Promise<TestCalculationsResponse> {
    const row = await this.currentRow(surveyId);
    if (!row || row.calculations.length === 0) throw new NoCalculationsException();
    return {
      sample: await this.sample(
        surveyId,
        await this.latestProcessedSurvey(surveyId),
        row.calculations,
      ),
    };
  }

  /**
   * Validate and store the whole set, each calculation with its `errors`
   * (invalid ones are stored too, and never run). In the same transaction the
   * results are deleted and a Compute in progress is cancelled. It never
   * computes.
   */
  async save(
    surveyId: string,
    input: CalculationInput[],
    revision: number,
  ): Promise<CalculationsStateDto> {
    await this.currentRow(surveyId);
    const calculations = await this.engine.validateCalculations(
      await this.latestProcessedSurvey(surveyId),
      toCalculations(input),
    );
    await this.db.manager.transaction(async (tx) => {
      await this.calculations.saveSet(surveyId, calculations, revision, tx);
      await this.computeJob.invalidate(tx, surveyId);
    });
    return this.getState(surveyId);
  }

  /** Queue the Compute job and return the state; 409 if one is already queued or running. */
  async compute(surveyId: string): Promise<CalculationsStateDto> {
    const row = await this.currentRow(surveyId);
    if (!row || row.calculations.length === 0) throw new NoCalculationsException();
    await this.jobs.enqueue(CALC_COMPUTE, surveyId, '');
    return this.getState(surveyId);
  }

  /** Evaluate a stored (validated) set on the most recent completed responses. */
  private async sample(
    surveyId: string,
    processedSurvey: string,
    calculations: Calculation[],
  ): Promise<CalculationSampleRow[]> {
    const rows = await this.calculations.recentCompleted(surveyId, SAMPLE_SIZE);
    if (rows.length === 0) return [];
    const output = await this.engine.calculate(
      processedSurvey,
      calculations,
      Object.fromEntries(rows.map((r) => [r.id, r.values ?? {}])),
    );
    return rows.map((r) => ({
      responseId: r.id,
      index: r.index,
      preview: r.preview,
      results: output[r.id]?.results ?? {},
      errors: output[r.id]?.errors ?? {},
    }));
  }

  /** The survey's row (null when nothing was saved yet). 404 for an unknown survey. */
  private async currentRow(surveyId: string) {
    if (!(await this.calculations.surveyExists(surveyId))) {
      throw new SurveyNotFoundException();
    }
    return this.calculations.find(surveyId);
  }

  /** The latest version's processed survey (published or not), as JSON. */
  private async latestProcessedSurvey(surveyId: string): Promise<string> {
    return JSON.stringify((await this.design.getProcessedSurvey(surveyId, false)).output);
  }
}

/** The authored fields only, so nothing else reaches the engine or the store. */
function toCalculations(input: CalculationInput[]): Calculation[] {
  return input.map(({ code, label, expression }) => ({ code, label, expression }));
}
