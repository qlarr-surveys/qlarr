import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Db, JobWithMetadata, PgBoss } from 'pg-boss';
import { EntityManager } from 'typeorm';
import { formatWallClockUtc } from '../common/datetime';
import { returnedRows } from '../common/returned-rows';
import { DbContext } from '../database/db-context';
import { JobErrorCode } from './job-handler';
import { JobRegistry } from './job-registry';
import { JOB_ERROR_MARKER, PG_BOSS } from './jobs.constants';
import { JobAlreadyActiveException, JobNotFoundException } from './jobs.exceptions';
import { JobProgress, JobsRepository } from './jobs.repository';

/** A job's pg-boss data: its subject, nothing else. */
export interface JobData {
  surveyId: string;
  subjectKey: string;
}

/** A subject's job as the UI shows it. */
export interface JobStatusDto {
  /** The active job, to cancel it; null when nothing is queued or running. */
  jobId: string | null;
  status: 'waiting' | 'running' | 'failed' | 'none';
  error: string | null;
  /** Why it failed; null unless `failed`. */
  errorCode: JobErrorCode | null;
  startedAt: string | null;
  /** Responses done of the job's total; null unless queued or running. */
  progress: JobProgress | null;
}

/** One subject in `GET survey/:surveyId/jobs`. */
export interface SubjectJobDto extends JobStatusDto {
  kind: string;
  subjectKey: string;
  hasResults: boolean;
}

const ACTIVE_STATES = ['created', 'retry', 'active'];

/**
 * What features call to start, invalidate and report jobs, on pg-boss. A
 * subject is the job's `singletonKey`; its queue's `exclusive` policy allows
 * one queued or active job per key.
 */
@Injectable()
export class JobsService {
  constructor(
    @Inject(PG_BOSS) private readonly boss: PgBoss,
    private readonly registry: JobRegistry,
    private readonly rows: JobsRepository,
    private readonly db: DbContext,
  ) {}

  /**
   * Queue a job, and its row, in one transaction; 409 if one is already queued
   * or running on the subject.
   */
  enqueue(kind: string, surveyId: string, subjectKey: string): Promise<string> {
    return this.db.manager.transaction(async (tx) => {
      const data: JobData = { surveyId, subjectKey };
      const id = await this.boss.send(kind, data, {
        singletonKey: subjectOf(surveyId, subjectKey),
        db: txDb(tx),
      });
      if (!id) throw new JobAlreadyActiveException();
      await this.rows.insert(tx, id, surveyId);
      return id;
    });
  }

  /**
   * The survey is being deleted: delete its jobs, in the delete's `tx`. A
   * running job is aborted once its heartbeat finds it gone; its rows go with
   * the survey. Each kind deletes only the ids in its own queue.
   */
  async deleteForSurvey(tx: EntityManager, surveyId: string): Promise<void> {
    const ids = await this.rows.idsOfSurvey(tx, surveyId);
    if (ids.length === 0) return;
    for (const handler of this.registry.all()) {
      await this.boss.deleteJob(handler.kind, ids, { db: txDb(tx) });
    }
  }

  /**
   * The subject's input changed: cancel its job, in `tx`. The caller deletes
   * the results in the same `tx`, and fences off writes the job still makes.
   */
  async invalidate(
    tx: EntityManager,
    kind: string,
    surveyId: string,
    subjectKey: string,
  ): Promise<void> {
    const db = txDb(tx);
    const active = (await this.jobsOf(kind, surveyId, subjectKey, db)).filter((j) =>
      ACTIVE_STATES.includes(j.state),
    );
    if (active.length > 0) await this.boss.cancel(kind, active.map((j) => j.id), { db });
  }

  /** A survey design change, passed to every kind in the change's `tx`. */
  async onDesignChange(tx: EntityManager, surveyId: string): Promise<void> {
    for (const handler of this.registry.all()) {
      await handler.onDesignChange?.(tx, surveyId);
    }
  }

  async status(kind: string, surveyId: string, subjectKey: string): Promise<JobStatusDto> {
    const jobs = await this.jobsOf(kind, surveyId, subjectKey);
    const job = jobs[jobs.length - 1];
    return toStatus(job, job && (await this.rows.progress(job.id)));
  }

  /** Every subject of every kind the caller's roles can see; 404 for an unknown survey. */
  async list(surveyId: string, authorities: string[]): Promise<SubjectJobDto[]> {
    const result: SubjectJobDto[] = [];
    for (const handler of this.registry.all()) {
      if (!handler.roles.some((r) => authorities.includes(r))) continue;
      for (const subjectKey of await handler.subjects(surveyId)) {
        result.push({
          kind: handler.kind,
          subjectKey,
          ...(await this.status(handler.kind, surveyId, subjectKey)),
          hasResults: await handler.hasResults(surveyId, subjectKey),
        });
      }
    }
    return result;
  }

  /** Cancel one of the survey's jobs; its results so far stay. Returns the subject's status. */
  async cancel(surveyId: string, jobId: string, authorities: string[]): Promise<JobStatusDto> {
    for (const handler of this.registry.all()) {
      const [job] = await this.boss.findJobs<JobData>(handler.kind, { id: jobId });
      if (!job || job.data.surveyId !== surveyId) continue;
      if (!handler.roles.some((r) => authorities.includes(r))) {
        throw new ForbiddenException('Insufficient role');
      }
      await this.boss.cancel(handler.kind, job.id);
      return this.status(handler.kind, surveyId, job.data.subjectKey);
    }
    throw new JobNotFoundException();
  }

  /** The subject's jobs, oldest first. */
  private jobsOf(
    kind: string,
    surveyId: string,
    subjectKey: string,
    db?: Db,
  ): Promise<JobWithMetadata<JobData>[]> {
    return this.boss.findJobs<JobData>(kind, {
      key: subjectOf(surveyId, subjectKey),
      limit: 100_000,
      db,
    });
  }
}

function subjectOf(surveyId: string, subjectKey: string): string {
  return `${surveyId}:${subjectKey}`;
}

/** pg-boss's database interface over a TypeORM transaction. */
function txDb(tx: EntityManager): Db {
  return {
    executeSql: async (text, values) => ({ rows: returnedRows(await tx.query(text, values)) }),
  };
}

function toStatus(
  job: JobWithMetadata<JobData> | undefined,
  progress: JobProgress | null | undefined,
): JobStatusDto {
  const active = !!job && ACTIVE_STATES.includes(job.state);
  if (!job || !(active || job.state === 'failed')) {
    return {
      jobId: null,
      status: 'none',
      error: null,
      errorCode: null,
      startedAt: null,
      progress: null,
    };
  }
  const failure = active ? null : failureOf(job);
  return {
    jobId: active ? job.id : null,
    status: job.state === 'active' ? 'running' : active ? 'waiting' : 'failed',
    error: failure?.message ?? null,
    errorCode: failure?.code ?? null,
    startedAt: job.state === 'created' || !job.startedOn ? null : formatWallClockUtc(job.startedOn),
    progress: active ? (progress ?? null) : null,
  };
}

/**
 * Why a job failed, without reading pg-boss's messages: a handler's throw
 * carries our marker; otherwise pg-boss failed it, at its time limit if it
 * ran that long, else because its worker stopped. The message is for display.
 */
function failureOf(job: JobWithMetadata<JobData>): { message: string; code: JobErrorCode } {
  const stored = job.output as
    | { message?: string; value?: string | { message?: string }; [JOB_ERROR_MARKER]?: boolean }
    | null;
  const value = stored?.value;
  const message =
    stored?.message ?? (typeof value === 'string' ? value : value?.message) ?? 'The job failed';
  if (stored?.[JOB_ERROR_MARKER]) return { message, code: 'job_error' };
  const ranMs = (job.completedOn?.getTime() ?? Date.now()) - job.startedOn.getTime();
  if (ranMs >= job.expireInSeconds * 1000) return { message, code: 'time_limit' };
  return { message, code: 'stopped' };
}
