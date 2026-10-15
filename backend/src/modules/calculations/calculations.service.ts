import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EngineService } from '../../engine/engine.service';
import { Calculation } from '../../engine/engine.types';
import { DesignService } from '../design/design.service';
import { SurveyNotFoundException } from '../surveys/survey.exceptions';
import { toComputations } from './calculation-values';
import {
  COMPUTE_CHUNK_SIZE,
  RUN_TIME_LIMIT_SECONDS,
  SAMPLE_SIZE,
} from './calculations.constants';
import {
  CalculationInput,
  CalculationSampleRow,
  CalculationsStateDto,
  TestCalculationsResponse,
} from './calculations.dto';
import {
  CalculationRunInProgressException,
  NoCalculationsException,
} from './calculations.exceptions';
import { CalculationsRepository } from './calculations.repository';

/**
 * Calculated fields: authoring (validate, test, save) and the Compute run.
 *
 * Validation runs only on Save and import, and the whole validated set is
 * stored, each calculation with its `errors`. Test and Compute pass the stored
 * set to the engine as it is; the engine never runs a calculation with errors.
 * Everything runs against the survey's latest version. Nothing is allowed while
 * a run is in progress, and results only show once a run has completed on the
 * current set (a save sets `idle`).
 */
@Injectable()
export class CalculationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CalculationsService.name);

  constructor(
    private readonly calculations: CalculationsRepository,
    private readonly design: DesignService,
    private readonly engine: EngineService,
  ) {}

  /** A run can't survive a restart: anything still `running` is `failed`. */
  async onApplicationBootstrap(): Promise<void> {
    await this.calculations.resetRunningOnBoot();
  }

  async getState(surveyId: string): Promise<CalculationsStateDto> {
    const row = await this.currentRow(surveyId);
    const status = row?.status ?? 'idle';
    return {
      calculations: row?.calculations ?? [],
      revision: row?.revision ?? 0,
      status,
      progress: { done: row?.progressDone ?? 0, total: row?.progressTotal ?? 0 },
      startedAt: row?.startedAt ?? null,
      newSinceLastRun:
        status === 'completed'
          ? await this.calculations.countWithoutComputations(surveyId)
          : null,
    };
  }

  /**
   * Evaluate the saved set, as stored, on the sample. No validation (the set
   * was validated when saved) and nothing is stored.
   */
  async test(surveyId: string): Promise<TestCalculationsResponse> {
    const row = await this.assertNotRunning(surveyId);
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
   * (invalid ones are stored too, and never run). Saving sets `status = idle`,
   * so every response shows "not computed" until the next Compute. It never
   * computes.
   */
  async save(
    surveyId: string,
    input: CalculationInput[],
    revision: number,
  ): Promise<CalculationsStateDto> {
    await this.assertNotRunning(surveyId);
    const calculations = await this.engine.validateCalculations(
      await this.latestProcessedSurvey(surveyId),
      toCalculations(input),
    );
    await this.calculations.saveSet(surveyId, calculations, revision);
    return this.getState(surveyId);
  }

  /**
   * Start a Compute run in the background and return straight away with the
   * state (`running`). The run is the only thing that writes `computations`.
   */
  async compute(surveyId: string): Promise<CalculationsStateDto> {
    const row = await this.assertNotRunning(surveyId);
    if (!row || row.calculations.length === 0) throw new NoCalculationsException();

    const processedSurvey = await this.latestProcessedSurvey(surveyId);
    const ids = await this.calculations.completedResponseIds(surveyId);
    const startedAt = await this.calculations.startRun(surveyId, ids.length);
    if (!startedAt) throw new CalculationRunInProgressException();

    void this.run(surveyId, startedAt, processedSurvey, row.calculations, ids);
    return this.getState(surveyId);
  }

  /**
   * The Compute run. Works through the responses in chunks, one engine call per
   * chunk, writing each chunk's results and progress only while it is still the
   * current run. Fails after the time limit, or as soon as a chunk fails.
   */
  private async run(
    surveyId: string,
    startedAt: string,
    processedSurvey: string,
    calculations: Calculation[],
    ids: string[],
  ): Promise<void> {
    const deadline = this.now() + RUN_TIME_LIMIT_SECONDS * 1000;
    try {
      for (let done = 0; done < ids.length; ) {
        if (this.now() > deadline) {
          await this.calculations.updateRun(surveyId, startedAt, { status: 'failed' });
          return;
        }
        const chunk = ids.slice(done, done + COMPUTE_CHUNK_SIZE);
        const output = await this.engine.calculate(
          processedSurvey,
          calculations,
          await this.calculations.responseValues(chunk),
        );
        await this.calculations.writeComputations(
          surveyId,
          Object.entries(output).map(([id, result]) => ({
            id,
            computations: toComputations(result),
          })),
          startedAt,
        );
        done += chunk.length;
        // False when the run has expired or been replaced: stop.
        if (!(await this.calculations.updateRun(surveyId, startedAt, { progressDone: done }))) {
          return;
        }
      }
      await this.calculations.updateRun(surveyId, startedAt, { status: 'completed' });
    } catch (err) {
      this.logger.warn(`Compute run failed for survey ${surveyId}: ${String(err)}`);
      await this.calculations
        .updateRun(surveyId, startedAt, { status: 'failed' })
        .catch(() => undefined);
    }
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

  /**
   * The survey's row (null when nothing was saved yet), after expiring a run
   * past the time limit. 404 for an unknown survey.
   */
  private async currentRow(surveyId: string) {
    if (!(await this.calculations.surveyExists(surveyId))) {
      throw new SurveyNotFoundException();
    }
    await this.calculations.expireStaleRun(surveyId);
    return this.calculations.find(surveyId);
  }

  /** The current row, or 409 while a run is in progress. */
  private async assertNotRunning(surveyId: string) {
    const row = await this.currentRow(surveyId);
    if (row?.status === 'running') throw new CalculationRunInProgressException();
    return row;
  }

  /** The clock the run's time limit is measured with (a method, so tests can move it). */
  private now(): number {
    return Date.now();
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
