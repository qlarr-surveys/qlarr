import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Role } from '../../auth/role.enum';
import { EngineService } from '../../engine/engine.service';
import { Calculation } from '../../engine/engine.types';
import { JobContext } from '../../jobs/job-context';
import { Job, JobHandler, ResponseFailure } from '../../jobs/job-handler';
import { JobRegistry } from '../../jobs/job-registry';
import { JobsService } from '../../jobs/jobs.service';
import { DesignService } from '../design/design.service';
import { toComputations } from './calculation-values';
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
 * next 10K completed responses without results, in chunks of 200, within 2
 * minutes. Always incremental, since any results that exist are valid: the
 * next Compute runs the rest. A response the engine returns no result for is a
 * failure, skipped by later Computes until retried; an engine throw fails the job.
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
    await this.context.run(job, (m) =>
      this.calculations.writeComputations(
        m,
        ctx.epoch,
        job.surveyId,
        Object.entries(output).map(([id, result]) => ({
          id,
          computations: toComputations(result),
        })),
      ),
    );
    return ids.filter((id) => !(id in output)).map((id) => ({ id, error: 'No result' }));
  }

  hasResults(surveyId: string): Promise<boolean> {
    return this.calculations.hasComputations(surveyId);
  }

  /** The set goes out of date, and its results go. */
  async onDesignChange(tx: EntityManager, surveyId: string): Promise<void> {
    await this.calculations.markOutOfDate(tx, surveyId);
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
