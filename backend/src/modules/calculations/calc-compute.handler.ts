import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Role } from '../../auth/role.enum';
import { EngineService } from '../../engine/engine.service';
import { Calculation } from '../../engine/engine.types';
import { JobContext } from '../../jobs/job-context';
import { JobFailuresRepository } from '../../jobs/job-failures.repository';
import { Job, JobHandler, ResponseFailure } from '../../jobs/job-handler';
import { JobRegistry } from '../../jobs/job-registry';
import { JobsService } from '../../jobs/jobs.service';
import { DesignService } from '../design/design.service';
import { SurveyNotFoundException } from '../surveys/survey.exceptions';
import {
  CALC_COMPUTE,
  COMPUTE_CHUNK_SIZE,
  COMPUTE_TIME_LIMIT_SECONDS,
  MAX_COMPUTE_FAILURES,
  MAX_RESPONSES_PER_JOB,
} from './calculations.constants';
import { CalculationsRepository } from './calculations.repository';

interface ComputeContext {
  processedSurvey: string;
  calculations: Calculation[];
  /** The `results_epoch` read with the set; the writes need it still current. */
  epoch: number;
}

/**
 * The Compute job (one subject per survey, `''`): runs the stored set on the
 * next 50K completed responses without results, in chunks of 200, within 2
 * minutes. Always incremental, since any results that exist are valid: the
 * next Compute runs the rest. Only error-free results are written; a response
 * with any error (or no result) is a failure instead, skipped by later Computes
 * until retried. An engine throw fails the job.
 */
@Injectable()
export class CalcComputeHandler implements JobHandler<ComputeContext>, OnModuleInit {
  readonly kind = CALC_COMPUTE;
  readonly roles = [Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST];
  readonly timeLimitSeconds = COMPUTE_TIME_LIMIT_SECONDS;
  readonly maxResponses = MAX_RESPONSES_PER_JOB;
  readonly chunkSize = COMPUTE_CHUNK_SIZE;
  readonly maxFailures = MAX_COMPUTE_FAILURES;

  constructor(
    private readonly registry: JobRegistry,
    private readonly jobs: JobsService,
    private readonly context: JobContext,
    private readonly failures: JobFailuresRepository,
    private readonly calculations: CalculationsRepository,
    private readonly design: DesignService,
    private readonly engine: EngineService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async subjects(surveyId: string): Promise<string[]> {
    if (!(await this.calculations.surveyExists(surveyId))) {
      throw new SurveyNotFoundException();
    }
    return [''];
  }

  async prepare(job: Job): Promise<ComputeContext> {
    // The epoch before the design: a design change between the two reads bumps
    // it, so this job's writes are fenced off instead of landing as current.
    const row = await this.context.run(job, (m) => this.calculations.find(job.surveyId, m));
    const processed = await this.context.run(job, () =>
      this.design.getProcessedSurvey(job.surveyId, false),
    );
    return {
      processedSurvey: JSON.stringify(processed.output),
      calculations: row?.calculations ?? [],
      epoch: row?.resultsEpoch ?? 0,
    };
  }

  pending(job: Job, limit: number, m: EntityManager): Promise<string[]> {
    return this.calculations.uncomputedResponseIds(job.surveyId, limit, m);
  }

  async runChunk(
    job: Job,
    ids: string[],
    ctx: ComputeContext,
    signal: AbortSignal,
  ): Promise<ResponseFailure[]> {
    const values = await this.context.run(job, (m) => this.calculations.responseValues(ids, m));
    const output = await this.engine.calculate(ctx.processedSurvey, ctx.calculations, values, {
      pool: 'job',
      signal,
    });
    const labels = new Map(ctx.calculations.map((c) => [c.code, c.label]));
    const failures: ResponseFailure[] = [];
    const rows: Array<{ id: string; computations: Record<string, unknown> }> = [];
    for (const id of ids) {
      const result = output[id];
      const errors = Object.entries(result?.errors ?? {});
      if (!result) failures.push({ id, error: 'No result' });
      else if (errors.length > 0) {
        failures.push({
          id,
          error: errors
            .map(([code, e]) => `${labels.get(code)} (${code}): ${e.name}: ${e.message}`)
            .join('; '),
        });
      } else rows.push({ id, computations: result.results });
    }
    // A response has either results or a failure: its failure goes with the write.
    await this.context.run(job, (m) =>
      m.transaction(async (tx) => {
        const written = await this.calculations.writeComputations(
          tx,
          ctx.epoch,
          job.surveyId,
          rows,
        );
        await this.failures.clear(tx, job, written);
      }),
    );
    return failures;
  }

  isCurrent(tx: EntityManager, job: Job, ctx: ComputeContext): Promise<boolean> {
    return this.calculations.isEpochCurrent(tx, job.surveyId, ctx.epoch);
  }

  hasResults(surveyId: string): Promise<boolean> {
    return this.calculations.hasComputations(surveyId);
  }

  /**
   * The set goes out of date, and its results go. A set already out of date
   * had them cleared then, and a Compute since runs no calculation.
   */
  async onDesignChange(tx: EntityManager, surveyId: string): Promise<void> {
    if (!(await this.calculations.markOutOfDate(tx, surveyId))) return;
    await this.invalidate(tx, surveyId);
  }

  /**
   * Cancel the survey's Compute and delete its results, in `tx`. The delete
   * fences off the job's writes, so it holds even if the job outlives the cancel.
   */
  async invalidate(tx: EntityManager, surveyId: string): Promise<void> {
    await this.jobs.invalidate(tx, this.kind, surveyId, '');
    await this.calculations.clearComputations(tx, surveyId);
  }
}
