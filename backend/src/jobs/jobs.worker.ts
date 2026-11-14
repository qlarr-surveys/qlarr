import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import type { PgBoss } from 'pg-boss';
import jobsConfig from '../config/jobs.config';
import { Job, JobErrorCode, JobHandler } from './job-handler';
import { JobRegistry } from './job-registry';
import { JobSteps } from './job-steps';
import {
  HEARTBEAT_SECONDS,
  JOB_ERROR_MARKER,
  PG_BOSS,
  POLLING_INTERVAL_SECONDS,
  RETENTION_SECONDS,
  SWEEP_INTERVAL_SECONDS,
} from './jobs.constants';
import { JobsRepository } from './jobs.repository';
import { JobData } from './jobs.service';

/**
 * Starts pg-boss, creates one queue per registered kind (at most one queued or
 * active job per subject, the kind's time limit, no retries), and, when
 * `JOBS_WORKER` is on, runs each kind's jobs `JOB_SLOTS` at a time. pg-boss
 * aborts a job's signal when it is cancelled or past its time limit. Every
 * process sweeps the `jobs` rows of jobs pg-boss deleted, hourly.
 */
@Injectable()
export class JobsWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(JobsWorker.name);
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    @Inject(PG_BOSS) private readonly boss: PgBoss,
    @Inject(jobsConfig.KEY) private readonly config: ConfigType<typeof jobsConfig>,
    private readonly registry: JobRegistry,
    private readonly rows: JobsRepository,
    private readonly steps: JobSteps,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.boss.on('error', (err) => this.logger.warn(`pg-boss: ${String(err)}`));
    await this.boss.start();
    this.sweepTimer = setInterval(() => {
      this.rows.sweep().catch((err) => this.logger.warn(`jobs sweep: ${String(err)}`));
    }, SWEEP_INTERVAL_SECONDS * 1000);
    for (const handler of this.registry.all()) {
      const options = {
        expireInSeconds: handler.timeLimitSeconds,
        heartbeatSeconds: HEARTBEAT_SECONDS,
        retryLimit: 0,
        deleteAfterSeconds: RETENTION_SECONDS,
      };
      // A no-op for an existing queue, so the update applies changed limits.
      await this.boss.createQueue(handler.kind, { policy: 'exclusive', ...options });
      await this.boss.updateQueue(handler.kind, options);
      if (!this.config.worker) continue;
      await this.boss.work<JobData>(
        handler.kind,
        {
          localConcurrency: this.config.slots,
          pollingIntervalSeconds: POLLING_INTERVAL_SECONDS,
        },
        ([job]) =>
          this.run(handler, { id: job.id, kind: handler.kind, ...job.data }, job.signal),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.sweepTimer);
    await this.boss.stop({ graceful: true, timeout: 5_000 });
  }

  /**
   * The job's steps (`JobSteps`), its chunks one at a time until done or
   * aborted. A chunk caught by the fence stops the run (pg-boss settles
   * nothing on a job no longer active). Past `maxFailures` the job fails; its
   * results and failures so far stay. A throw is stored marked with its code
   * (`job_error` unless said), so `JobsService` tells it apart from a failure
   * pg-boss records itself without reading pg-boss's messages.
   */
  private async run(handler: JobHandler, job: Job, signal: AbortSignal): Promise<void> {
    try {
      const { ctx, chunks } = await this.steps.plan(handler, job);
      let failedTotal = 0;
      for (const chunk of chunks) {
        signal.throwIfAborted();
        const failed = await handler.runChunk(job, chunk, ctx, signal);
        // Cancelled before its signal fired, or its input changed: no more chunks.
        if (!(await this.steps.commit(handler, job, ctx, chunk, failed))) return;
        failedTotal += failed.length;
        if (failedTotal > handler.maxFailures) {
          throw new JobFailedError('Too many responses failed', 'too_many_failures');
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const code: JobErrorCode = err instanceof JobFailedError ? err.code : 'job_error';
      throw Object.assign(error, { [JOB_ERROR_MARKER]: code });
    }
  }
}

/** A job failure with its own code, rather than `job_error`. */
export class JobFailedError extends Error {
  constructor(
    message: string,
    readonly code: JobErrorCode,
  ) {
    super(message);
  }
}
