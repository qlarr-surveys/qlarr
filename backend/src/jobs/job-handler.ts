import { EntityManager } from 'typeorm';
import { Role } from '../auth/role.enum';

/**
 * A job as a handler sees it: its pg-boss id, kind (the queue) and subject. It
 * carries no other data: everything it works on is read from the database when
 * it runs (any change to that input cancels the job).
 */
export interface Job {
  id: string;
  kind: string;
  surveyId: string;
  subjectKey: string;
}

/**
 * Why a job failed: it reached its time limit, the job itself threw, or its
 * worker stopped (the server shut down, or it stopped heartbeating).
 */
export type JobErrorCode = 'time_limit' | 'job_error' | 'stopped';

/** What `prepare` hands the runner: the responses to work on, and shared state. */
export interface PreparedJob<Ctx> {
  responseIds: string[];
  ctx: Ctx;
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

  /** Every subject of the survey this kind can run for; 404 for an unknown survey. */
  subjects(surveyId: string): Promise<string[]>;
  /**
   * Read the input and list the responses to work on, once the job starts.
   * The list is trimmed to `maxResponses`; reading no more than `limit` saves
   * loading the rest.
   */
  prepare(job: Job, limit: number): Promise<PreparedJob<Ctx>>;
  /**
   * Do one chunk and write its results, guarded so none land once the input
   * changed (the job can outlive its cancel).
   * `signal` aborts once the job is cancelled or past its time limit.
   */
  runChunk(job: Job, responseIds: string[], ctx: Ctx, signal: AbortSignal): Promise<void>;
  /** Whether any results exist for the subject. */
  hasResults(surveyId: string, subjectKey: string): Promise<boolean>;
  /** A design change: invalidate whatever it affects, in the change's `tx`. */
  onDesignChange?(tx: EntityManager, surveyId: string): Promise<void>;
}
