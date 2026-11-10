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
import { JobContext } from './job-context';
import { JobFailuresRepository } from './job-failures.repository';
import { Job, JobErrorCode, JobHandler } from './job-handler';
import { JobRegistry } from './job-registry';
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
    private readonly context: JobContext,
    private readonly rows: JobsRepository,
    private readonly failures: JobFailuresRepository,
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
   * Prepare, list the responses (a normal run's pending ones, or a retry's
   * failed ones), trim to `maxResponses`, then run the chunks until done or
   * aborted. Each chunk's failures and progress are written in one
   * transaction, fenced so none land once the job was cancelled. Past
   * `maxFailures` the job fails; its results and failures so far stay.
   * A throw is stored marked with its code (`job_error` unless said), so
   * `JobsService` tells it apart from a failure pg-boss records itself
   * without reading pg-boss's messages.
   */
  private async run(handler: JobHandler, job: Job, signal: AbortSignal): Promise<void> {
    try {
      const ctx = await handler.prepare(job);
      const listed = await this.context.run(job, (m) =>
        job.retry
          ? this.failures.responseIds(m, job, handler.maxResponses)
          : handler.pending(job, handler.maxResponses, m),
      );
      const ids = listed.slice(0, handler.maxResponses);
      await this.context.run(job, (m) => this.rows.setTotal(m, job.id, ids.length));
      let failedTotal = 0;
      for (let i = 0; i < ids.length; i += handler.chunkSize) {
        signal.throwIfAborted();
        const chunk = ids.slice(i, i + handler.chunkSize);
        const failed = await handler.runChunk(job, chunk, ctx, signal);
        const failedIds = new Set(failed.map((f) => f.id));
        await this.context.run(job, (m) =>
          m.transaction(async (tx) => {
            if (!(await this.rows.lockIfActive(tx, job.kind, job.id))) return;
            await this.failures.record(tx, job, failed);
            await this.failures.clear(
              tx,
              job,
              chunk.filter((id) => !failedIds.has(id)),
            );
            await this.rows.addDone(tx, job.id, chunk.length);
            await this.rows.addFailed(tx, job.id, failed.length);
          }),
        );
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
class JobFailedError extends Error {
  constructor(
    message: string,
    readonly code: JobErrorCode,
  ) {
    super(message);
  }
}
