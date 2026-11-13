import { EntityManager } from 'typeorm';
import { Role } from '../auth/role.enum';

/**
 * A job as a handler sees it: its pg-boss id, kind (the queue), subject, and
 * whether it retries the subject's failed responses. It carries no other data:
 * everything it works on is read from the database when it runs (any change to
 * that input cancels the job).
 */
export interface Job {
  id: string;
  kind: string;
  surveyId: string;
  subjectKey: string;
  retry: boolean;
}

/**
 * Why a job failed: it reached its time limit, the job itself threw, its
 * worker stopped (the server shut down, or it stopped heartbeating), or more
 * of its responses failed than its kind allows.
 */
export type JobErrorCode = 'time_limit' | 'job_error' | 'stopped' | 'too_many_failures';

/** A response the handler could not do; the job carries on without it. */
export interface ResponseFailure {
  id: string;
  error: string;
}

/**
 * One kind of job. Feature modules implement it and register it with the
 * `JobRegistry` in `onModuleInit`. Every kind has a time limit and a response
 * limit, both enforced by the jobs module.
 */
export interface JobHandler<Ctx = unknown> {
  /** E.g. `calc.compute`; also its pg-boss queue. */
  readonly kind: string;
  /** Roles that may see and cancel this kind's jobs. */
  readonly roles: Role[];
  /** A running job fails this long after it started. */
  readonly timeLimitSeconds: number;
  /** At most this many responses per job; the next job runs the rest. */
  readonly maxResponses: number;
  /** Responses per `runChunk`. */
  readonly chunkSize: number;
  /** A job fails once more than this many of its responses failed. */
  readonly maxFailures: number;

  /** Every subject of the survey this kind can run for; 404 for an unknown survey. */
  subjects(surveyId: string): Promise<string[]>;
  /** Read the input, once the job starts. */
  prepare(job: Job): Promise<Ctx>;
  /**
   * The responses a normal run works on, leaving out the subject's failed ones
   * (`pendingFilter`). The list is trimmed to `maxResponses`; reading no more
   * than `limit` saves loading the rest. A retry works on the failed ones instead.
   */
  pending(job: Job, limit: number, m: EntityManager): Promise<string[]>;
  /**
   * Do one chunk and write its results, guarded so none land once the input
   * changed (the job can outlive its cancel), deleting the written responses'
   * failures in the same transaction (`JobFailuresRepository.clear`), so a
   * response never has both. Returns the responses that failed; a throw fails
   * the whole job.
   * `signal` aborts once the job is cancelled or past its time limit.
   */
  runChunk(
    job: Job,
    responseIds: string[],
    ctx: Ctx,
    signal: AbortSignal,
  ): Promise<ResponseFailure[]>;
  /**
   * Whether the input `ctx` was read from is still current, checked in the
   * chunk's failure write `tx` before the job's row is locked, so failures
   * worked out from changed input are dropped. A change the job's cancel missed
   * (it was queued as the change ran) still stops it.
   */
  isCurrent?(tx: EntityManager, job: Job, ctx: Ctx): Promise<boolean>;
  /** Whether any results exist for the subject. */
  hasResults(surveyId: string, subjectKey: string): Promise<boolean>;
  /** A design change: invalidate whatever it affects, in the change's `tx`. */
  onDesignChange?(tx: EntityManager, surveyId: string): Promise<void>;
}
