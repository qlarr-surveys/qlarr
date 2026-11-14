import { Injectable } from '@nestjs/common';
import { JobContext } from './job-context';
import { JobFailuresRepository } from './job-failures.repository';
import { Job, JobHandler, ResponseFailure } from './job-handler';
import { JobsRepository } from './jobs.repository';

/** A job's work: its handler's context, and the responses to run in chunks. */
export interface JobPlan<Ctx = unknown> {
  ctx: Ctx;
  chunks: string[][];
}

/**
 * A job's steps, apart from how its chunks are scheduled, so a worker that
 * schedules them its own way keeps the same steps.
 */
@Injectable()
export class JobSteps {
  constructor(
    private readonly context: JobContext,
    private readonly rows: JobsRepository,
    private readonly failures: JobFailuresRepository,
  ) {}

  /**
   * Prepare, list the responses (a normal run's pending ones, or a retry's
   * failed ones), trim to `maxResponses`, record the total, and split them
   * into chunks.
   */
  async plan<Ctx>(handler: JobHandler<Ctx>, job: Job): Promise<JobPlan<Ctx>> {
    const ctx = await handler.prepare(job);
    const listed = await this.context.run(job, (m) =>
      job.retry
        ? this.failures.responseIds(m, job, handler.maxResponses)
        : handler.pending(job, handler.maxResponses, m),
    );
    const ids = listed.slice(0, handler.maxResponses);
    await this.context.run(job, (m) => this.rows.setTotal(m, job.id, ids.length));
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += handler.chunkSize) {
      chunks.push(ids.slice(i, i + handler.chunkSize));
    }
    return { ctx, chunks };
  }

  /**
   * Write a chunk's failures and progress in one transaction, fenced so none
   * land once the job was cancelled or its input changed (`isCurrent`).
   * False when fenced: the job runs no more chunks.
   */
  commit<Ctx>(
    handler: JobHandler<Ctx>,
    job: Job,
    ctx: Ctx,
    chunk: string[],
    failed: ResponseFailure[],
  ): Promise<boolean> {
    return this.context.run(job, (m) =>
      m.transaction(async (tx) => {
        // The input first: a change locks it before the job's row.
        if (handler.isCurrent && !(await handler.isCurrent(tx, job, ctx))) return false;
        if (!(await this.rows.lockIfActive(tx, job.kind, job.id))) return false;
        await this.failures.record(tx, job, failed);
        await this.rows.addDone(tx, job.id, chunk.length);
        await this.rows.addFailed(tx, job.id, failed.length);
        return true;
      }),
    );
  }
}
