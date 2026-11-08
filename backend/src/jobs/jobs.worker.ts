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
import { JobHandler } from './job-handler';
import { JobRegistry } from './job-registry';
import {
  HEARTBEAT_SECONDS,
  JOB_ERROR_MARKER,
  PG_BOSS,
  POLLING_INTERVAL_SECONDS,
  RETENTION_SECONDS,
} from './jobs.constants';
import { JobData } from './jobs.service';

/**
 * Starts pg-boss, creates one queue per registered kind (at most one queued or
 * active job per subject, the kind's time limit, no retries), and, when
 * `JOBS_WORKER` is on, runs each kind's jobs `JOB_SLOTS` at a time. pg-boss
 * aborts a job's signal when it is cancelled or past its time limit.
 */
@Injectable()
export class JobsWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(JobsWorker.name);

  constructor(
    @Inject(PG_BOSS) private readonly boss: PgBoss,
    @Inject(jobsConfig.KEY) private readonly config: ConfigType<typeof jobsConfig>,
    private readonly registry: JobRegistry,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.boss.on('error', (err) => this.logger.warn(`pg-boss: ${String(err)}`));
    await this.boss.start();
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
    await this.boss.stop({ graceful: true, timeout: 5_000 });
  }

  /**
   * Prepare, trim to `maxResponses`, then run the chunks until done or aborted.
   * A throw is stored marked `job_error`, so `JobsService` tells it apart from
   * a failure pg-boss records itself without reading pg-boss's messages.
   */
  private async run(
    handler: JobHandler,
    job: Parameters<JobHandler['prepare']>[0],
    signal: AbortSignal,
  ): Promise<void> {
    try {
      const { responseIds, ctx } = await handler.prepare(job, handler.maxResponses);
      const ids = responseIds.slice(0, handler.maxResponses);
      for (let i = 0; i < ids.length; i += handler.chunkSize) {
        signal.throwIfAborted();
        await handler.runChunk(job, ids.slice(i, i + handler.chunkSize), ctx, signal);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      throw Object.assign(error, { [JOB_ERROR_MARKER]: true });
    }
  }
}
