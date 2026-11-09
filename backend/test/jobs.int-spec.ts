import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Role } from '../src/auth/role.enum';
import type { PgBoss } from 'pg-boss';
import { Job, JobHandler } from '../src/jobs/job-handler';
import { JobRegistry } from '../src/jobs/job-registry';
import { PG_BOSS } from '../src/jobs/jobs.constants';
import { JobsRepository } from '../src/jobs/jobs.repository';
import { JobsService } from '../src/jobs/jobs.service';
import { bearer, startTestApp, TestApp } from './harness';

const BEARER = bearer({ authorities: ['super_admin'] });

/**
 * The jobs module on pg-boss, against a real Postgres: the one-active-job
 * rule, the time and response limits, and cancel reaching a running job. The
 * test kinds are registered before boot, since their queues are created then.
 */
describe('Jobs', () => {
  let ctx: TestApp;
  let app: INestApplication;
  let root: DataSource;
  let jobs: JobsService;
  let boss: PgBoss;

  /** Per job id: resolves once its chunk started, and whether its signal aborted. */
  const entered = new Map<string, () => void>();
  const started = new Map<string, Promise<void>>();
  const aborted = new Set<string>();
  const startedOf = (id: string) => {
    if (!started.has(id)) started.set(id, new Promise((r) => entered.set(id, r)));
    return started.get(id)!;
  };

  /** A kind whose one chunk waits until its signal aborts. */
  const blocking = (kind: string, timeLimitSeconds: number): JobHandler<null> => ({
    kind,
    roles: [Role.SUPER_ADMIN],
    timeLimitSeconds,
    maxResponses: 10,
    chunkSize: 10,
    subjects: async () => [''],
    prepare: async () => ({ responseIds: ['r'], ctx: null }),
    runChunk: (job: Job, _ids: string[], _ctx: null, signal: AbortSignal) =>
      new Promise((_resolve, reject) => {
        startedOf(job.id);
        entered.get(job.id)!();
        signal.addEventListener('abort', () => {
          aborted.add(job.id);
          reject(signal.reason);
        });
      }),
    hasResults: async () => false,
  });

  /** A kind that works through a survey's `pending` responses, 3 per job, 2 per chunk. */
  const pending = new Map<string, string[]>();
  const counting: JobHandler<null> = {
    kind: 'test.count',
    roles: [Role.SUPER_ADMIN],
    timeLimitSeconds: 60,
    maxResponses: 3,
    chunkSize: 2,
    subjects: async () => [''],
    // Ignores `limit`: the module trims.
    prepare: async (job: Job) => ({ responseIds: pending.get(job.surveyId) ?? [], ctx: null }),
    runChunk: async (job: Job, ids: string[]) => {
      pending.set(
        job.surveyId,
        (pending.get(job.surveyId) ?? []).filter((id) => !ids.includes(id)),
      );
    },
    hasResults: async () => false,
  };

  beforeAll(async () => {
    process.env.JOB_SLOTS = '4';
    ctx = await startTestApp({
      overrides: (b) =>
        b.overrideProvider(JobRegistry).useFactory({
          factory: () => {
            const registry = new JobRegistry();
            [blocking('test.block', 60), blocking('test.slow', 1), counting].forEach((h) =>
              registry.register(h),
            );
            return registry;
          },
        }),
    });
    app = ctx.app;
    root = ctx.root;
    jobs = app.get(JobsService);
    boss = app.get(PG_BOSS);
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const server = () => app.getHttpServer();

  const createSurvey = async (name: string): Promise<string> =>
    (
      await request(server())
        .post('/survey/create')
        .set('Authorization', BEARER)
        .send({ name })
        .expect(200)
    ).body.id;

  /** Poll the subject's status until `done` holds. */
  const waitFor = async (
    kind: string,
    survey: string,
    done: (s: Awaited<ReturnType<JobsService['status']>>) => boolean,
  ) => {
    for (let i = 0; i < 150; i++) {
      const s = await jobs.status(kind, survey, '');
      if (done(s)) return s;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('job never got there');
  };

  /** The job's row in `jobs`, or undefined. */
  const rowOf = async (id: string) =>
    (
      await root.query(
        `SELECT progress_done AS done, progress_total AS total FROM jobs WHERE id = $1`,
        [id],
      )
    )[0];

  /** Poll until the job's signal aborted (a heartbeat reaches it within ~5 s). */
  const waitAborted = async (id: string) => {
    for (let i = 0; i < 150 && !aborted.has(id); i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return aborted.has(id);
  };

  it('refuses a second job on an active subject with 409', async () => {
    const survey = await createSurvey('Twice');
    const first = await jobs.enqueue('test.block', survey, '');

    await expect(jobs.enqueue('test.block', survey, '')).rejects.toMatchObject({
      status: 409,
      response: { error: 'JobAlreadyActiveException' },
    });
    // Another subject, or once the first is over, is fine.
    await jobs.enqueue('test.block', survey, 'other');
    await jobs.cancel(survey, first, ['super_admin']);
    await jobs.enqueue('test.block', survey, '');

    await root.manager.transaction((tx) => jobs.invalidate(tx, 'test.block', survey, ''));
    await root.manager.transaction((tx) => jobs.invalidate(tx, 'test.block', survey, 'other'));
  });

  it('a job at its time limit is aborted in flight and fails', async () => {
    const survey = await createSurvey('Time limit');
    const id = await jobs.enqueue('test.slow', survey, '');

    await startedOf(id);

    expect(await waitFor('test.slow', survey, (s) => s.status === 'failed')).toMatchObject({
      errorCode: 'time_limit',
    });
    expect(aborted.has(id)).toBe(true);
  });

  it('a job stops at its response limit, and the next one runs the rest', async () => {
    const survey = await createSurvey('Response limit');
    pending.set(survey, ['a', 'b', 'c', 'd', 'e']);

    await jobs.enqueue('test.count', survey, '');
    await waitFor('test.count', survey, (s) => s.status === 'none');
    expect(pending.get(survey)).toEqual(['d', 'e']);

    await jobs.enqueue('test.count', survey, '');
    await waitFor('test.count', survey, (s) => s.status === 'none');
    expect(pending.get(survey)).toEqual([]);
  });

  it('reports the progress of a running job, and records it per chunk', async () => {
    const survey = await createSurvey('Progress');
    const blocked = await jobs.enqueue('test.block', survey, '');
    await startedOf(blocked);
    expect((await jobs.status('test.block', survey, '')).progress).toEqual({ done: 0, total: 1 });
    await jobs.cancel(survey, blocked, ['super_admin']);
    expect((await jobs.status('test.block', survey, '')).progress).toBeNull();

    pending.set(survey, ['a', 'b', 'c', 'd']);
    const id = await jobs.enqueue('test.count', survey, '');
    await waitFor('test.count', survey, (s) => s.status === 'none');
    expect(await rowOf(id)).toEqual({ done: 3, total: 3 });
  });

  it("sweeps the rows of jobs pg-boss deleted, and keeps the others", async () => {
    const survey = await createSurvey('Sweep');
    const gone = await jobs.enqueue('test.count', survey, '');
    await waitFor('test.count', survey, (s) => s.status === 'none');
    const kept = await jobs.enqueue('test.block', survey, '');
    await boss.deleteJob('test.count', gone);

    await app.get(JobsRepository).sweep();

    expect(await rowOf(gone)).toBeUndefined();
    expect(await rowOf(kept)).toBeDefined();
    await jobs.cancel(survey, kept, ['super_admin']);
  });

  it('deleting a survey deletes its jobs and aborts a running one', async () => {
    const survey = await createSurvey('Deleted');
    const id = await jobs.enqueue('test.block', survey, '');
    const queued = await jobs.enqueue('test.count', survey, '');
    await startedOf(id);

    await request(server()).delete(`/survey/${survey}`).set('Authorization', BEARER).expect(204);

    expect(await rowOf(id)).toBeUndefined();
    expect(await rowOf(queued)).toBeUndefined();
    expect(await boss.findJobs('test.block', { id })).toEqual([]);
    expect(await boss.findJobs('test.count', { id: queued })).toEqual([]);
    expect(await waitAborted(id)).toBe(true);
  });

  it('a cancel aborts the job in flight', async () => {
    const survey = await createSurvey('Cancel');
    const id = await jobs.enqueue('test.block', survey, '');
    await startedOf(id);
    expect((await jobs.status('test.block', survey, '')).status).toBe('running');

    expect(await jobs.cancel(survey, id, ['super_admin'])).toMatchObject({ status: 'none' });

    expect(await waitAborted(id)).toBe(true);
  });

  it("cancel is 404 for another survey's job and 403 without the kind's role", async () => {
    const survey = await createSurvey('Cancel owner');
    const other = await createSurvey('Cancel other');
    const id = await jobs.enqueue('test.block', survey, '');

    await expect(jobs.cancel(other, id, ['super_admin'])).rejects.toMatchObject({ status: 404 });
    await expect(jobs.cancel(survey, id, ['analyst'])).rejects.toMatchObject({ status: 403 });
    await jobs.cancel(survey, id, ['super_admin']);
  });

  it('a rolled-back invalidation leaves the job alone', async () => {
    const survey = await createSurvey('Rollback');
    const id = await jobs.enqueue('test.block', survey, '');
    await startedOf(id);

    await expect(
      root.manager.transaction(async (tx) => {
        await jobs.invalidate(tx, 'test.block', survey, '');
        throw new Error('rolled back');
      }),
    ).rejects.toThrow('rolled back');

    expect((await jobs.status('test.block', survey, '')).status).toBe('running');
    await jobs.cancel(survey, id, ['super_admin']);
  });

  it('GET jobs is 400 for a malformed survey id and 404 for an unknown one', async () => {
    await request(server()).get('/survey/nope/jobs').set('Authorization', BEARER).expect(400);
    await request(server())
      .get('/survey/10000000-0000-0000-0000-00000000ffff/jobs')
      .set('Authorization', BEARER)
      .expect(404);
  });
});
