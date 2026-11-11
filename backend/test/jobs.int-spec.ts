import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Role } from '../src/auth/role.enum';
import type { PgBoss } from 'pg-boss';
import { EntityManager } from 'typeorm';
import { JobFailuresRepository, pendingFilter } from '../src/jobs/job-failures.repository';
import { Job, JobHandler, ResponseFailure } from '../src/jobs/job-handler';
import { JobRegistry } from '../src/jobs/job-registry';
import { PG_BOSS } from '../src/jobs/jobs.constants';
import { JobsRepository } from '../src/jobs/jobs.repository';
import { JobsService } from '../src/jobs/jobs.service';
import { bearer, startTestApp, TestApp } from './harness';

const BEARER = bearer({ authorities: ['super_admin'] });

/** A made-up response id, as a uuid (failures are keyed by uuid). */
const rid = (n: number) => `30000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

/**
 * The jobs module on pg-boss, against a real Postgres: the one-active-job
 * rule, the time, response and failure limits, failed responses and their
 * retry, and cancel reaching a running job. The test kinds are registered
 * before boot, since their queues are created then.
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
    maxFailures: 0,
    subjects: async () => [''],
    prepare: async () => null,
    pending: async () => [rid(0)],
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
    maxFailures: 0,
    subjects: async () => [''],
    prepare: async () => null,
    // Ignores `limit`: the module trims.
    pending: async (job: Job) => pending.get(job.surveyId) ?? [],
    runChunk: async (job: Job, ids: string[]) => {
      pending.set(
        job.surveyId,
        (pending.get(job.surveyId) ?? []).filter((id) => !ids.includes(id)),
      );
      return [];
    },
    hasResults: async () => false,
  };

  /**
   * A kind over a survey's real responses, 3 per job, 2 per chunk, failing at
   * most 2: a response in `failing` fails (with its error), one in `done` is
   * left out, and a survey in `throwing` throws. `gates` holds a job's chunk
   * until released; `chunks` counts each job's chunks.
   */
  const done = new Set<string>();
  const failing = new Map<string, string>();
  const throwing = new Set<string>();
  const gates = new Map<string, Promise<void>>();
  const chunks = new Map<string, number>();
  const flaky: JobHandler<null> = {
    kind: 'test.flaky',
    roles: [Role.SUPER_ADMIN],
    timeLimitSeconds: 60,
    maxResponses: 3,
    chunkSize: 2,
    maxFailures: 2,
    subjects: async () => [''],
    prepare: async () => null,
    pending: async (job: Job, limit: number, m: EntityManager) =>
      (
        await m.query(
          `SELECT id FROM responses r
           WHERE survey_id = $1 AND NOT (id = ANY($3::uuid[]))
             AND ${pendingFilter('r.id', '$2', '$1', `''`)}
           ORDER BY id LIMIT $4`,
          [job.surveyId, job.kind, [...done], limit],
        )
      ).map((r: { id: string }) => r.id),
    runChunk: async (job: Job, ids: string[]): Promise<ResponseFailure[]> => {
      startedOf(job.id);
      entered.get(job.id)!();
      chunks.set(job.id, (chunks.get(job.id) ?? 0) + 1);
      await gates.get(job.surveyId);
      if (throwing.has(job.surveyId)) throw new Error('boom');
      const failures: ResponseFailure[] = [];
      const succeeded: string[] = [];
      for (const id of ids) {
        const error = failing.get(id);
        if (error) failures.push({ id, error });
        else succeeded.push(id);
      }
      succeeded.forEach((id) => done.add(id));
      await app.get(JobFailuresRepository).clear(root.manager, job, succeeded);
      return failures;
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
            [blocking('test.block', 60), blocking('test.slow', 1), counting, flaky].forEach((h) =>
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
    pending.set(survey, [1, 2, 3, 4, 5].map(rid));

    await jobs.enqueue('test.count', survey, '');
    await waitFor('test.count', survey, (s) => s.status === 'none');
    expect(pending.get(survey)).toEqual([4, 5].map(rid));

    await jobs.enqueue('test.count', survey, '');
    await waitFor('test.count', survey, (s) => s.status === 'none');
    expect(pending.get(survey)).toEqual([]);
  });

  it('reports the progress of a running job, and records it per chunk', async () => {
    const survey = await createSurvey('Progress');
    const blocked = await jobs.enqueue('test.block', survey, '');
    await startedOf(blocked);
    expect((await jobs.status('test.block', survey, '')).progress).toEqual({
      done: 0,
      total: 1,
      failed: 0,
    });
    await jobs.cancel(survey, blocked, ['super_admin']);
    expect((await jobs.status('test.block', survey, '')).progress).toBeNull();

    pending.set(survey, [1, 2, 3, 4].map(rid));
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

  describe('failed responses', () => {
    const ANALYST = bearer({ authorities: ['analyst'] });
    let next = 1000;

    /** `n` new completed responses of the survey, ascending ids. */
    const addResponses = async (survey: string, n: number): Promise<string[]> => {
      const [{ version }] = await root.query(
        `SELECT max(version) AS version FROM versions WHERE survey_id = $1`,
        [survey],
      );
      const ids = Array.from({ length: n }, () => rid(next++));
      for (const id of ids) {
        await root.query(
          `INSERT INTO responses
             (id, version, survey_id, preview, nav_index, start_date, submit_date,
              lang, events, "values")
           VALUES ($1,$2,$3,false,'','2024-01-01 00:00:00','2024-02-01 00:00:00',
                   'en','[]'::jsonb,'{}'::jsonb)`,
          [id, version, survey],
        );
      }
      return ids;
    };

    const failuresOf = (survey: string): Promise<Array<{ id: string; error: string }>> =>
      root.query(
        `SELECT response_id AS id, error FROM job_failures
         WHERE kind = 'test.flaky' AND survey_id = $1 AND subject_key = ''
         ORDER BY response_id`,
        [survey],
      );

    const failedOf = async (id: string): Promise<number> =>
      (await root.query(`SELECT progress_failed AS n FROM jobs WHERE id = $1`, [id]))[0].n;

    const settled = (s: { status: string }) => s.status !== 'waiting' && s.status !== 'running';

    const run = async (survey: string) => {
      const id = await jobs.enqueue('test.flaky', survey, '');
      return { id, status: await waitFor('test.flaky', survey, settled) };
    };

    const retry = (survey: string, auth = BEARER) =>
      request(server())
        .post(`/survey/${survey}/jobs/retry`)
        .set('Authorization', auth)
        .send({ kind: 'test.flaky', subjectKey: '' });

    it('records them, skips them on the next run, and reports completed_with_failures', async () => {
      const survey = await createSurvey('Failures');
      const [a, b, c, d, e] = await addResponses(survey, 5);
      failing.set(a, 'bad a').set(b, 'bad b');

      const first = await run(survey);
      expect(first.status).toMatchObject({
        status: 'completed_with_failures',
        failedCount: 2,
      });
      expect(await failuresOf(survey)).toEqual([
        { id: a, error: 'bad a' },
        { id: b, error: 'bad b' },
      ]);
      expect(await rowOf(first.id)).toEqual({ done: 3, total: 3 });
      expect(await failedOf(first.id)).toBe(2);

      // The failed ones take no slot of the next run's 3.
      const second = await run(survey);
      expect(await rowOf(second.id)).toEqual({ done: 2, total: 2 });
      expect([c, d, e].every((id) => done.has(id))).toBe(true);
      expect(second.status).toMatchObject({
        status: 'completed_with_failures',
        failedCount: 2,
      });

      // It outlives the job that recorded it.
      await boss.deleteJob('test.flaky', [first.id, second.id]);
      expect(await jobs.status('test.flaky', survey, '')).toMatchObject({
        status: 'completed_with_failures',
        failedCount: 2,
      });
    });

    it('past maxFailures the job fails with too_many_failures, keeping its failures', async () => {
      const survey = await createSurvey('Too many');
      const ids = await addResponses(survey, 3);
      ids.forEach((id) => failing.set(id, 'bad'));

      const { status } = await run(survey);

      expect(status).toMatchObject({
        status: 'failed',
        errorCode: 'too_many_failures',
        failedCount: 3,
      });
      expect((await failuresOf(survey)).map((f) => f.id)).toEqual(ids);
    });

    it('a throw fails the job as job_error', async () => {
      const survey = await createSurvey('Throws');
      await addResponses(survey, 1);
      throwing.add(survey);

      const { status } = await run(survey);

      expect(status).toMatchObject({
        status: 'failed',
        errorCode: 'job_error',
        failedCount: 0,
      });
    });

    it('a retry runs only the failed ones: a success clears, a failure overwrites', async () => {
      const survey = await createSurvey('Retry');
      const [a, b] = await addResponses(survey, 3);
      failing.set(a, 'old').set(b, 'old');
      await run(survey);
      failing.delete(a);
      failing.set(b, 'new');

      const res = await retry(survey).expect(200);
      expect(['waiting', 'running', 'completed_with_failures']).toContain(res.body.status);
      await waitFor('test.flaky', survey, settled);

      expect(await failuresOf(survey)).toEqual([{ id: b, error: 'new' }]);
      expect(done.has(a)).toBe(true);
      const id = await app.get(JobsRepository).latestId(root.manager, 'test.flaky', `${survey}:`);
      expect(await rowOf(id!)).toEqual({ done: 2, total: 2 });
    });

    it('a retry is 409 without failures', async () => {
      const survey = await createSurvey('No failures');
      const res = await retry(survey).expect(409);
      expect(res.body.error).toBe('NoFailuresException');
    });

    it("invalidate clears them, and fences off a cancelled job's late write", async () => {
      const survey = await createSurvey('Invalidate');
      const [a] = await addResponses(survey, 2);
      failing.set(a, 'bad');
      await run(survey);
      expect((await failuresOf(survey)).length).toBe(1);

      await root.manager.transaction((tx) => jobs.invalidate(tx, 'test.flaky', survey, ''));
      expect(await failuresOf(survey)).toEqual([]);
      expect(await jobs.status('test.flaky', survey, '')).toMatchObject({
        status: 'none',
        failedCount: 0,
      });

      // The chunk returns `a`'s failure only after the cancel committed.
      let release!: () => void;
      gates.set(survey, new Promise((r) => (release = r)));
      const id = await jobs.enqueue('test.flaky', survey, '');
      await startedOf(id);
      await root.manager.transaction((tx) => jobs.invalidate(tx, 'test.flaky', survey, ''));
      release();
      await new Promise((r) => setTimeout(r, 1000));

      expect(await failuresOf(survey)).toEqual([]);
      expect(await rowOf(id)).toEqual({ done: 0, total: 1 });
    });

    it('a cancel caught by the fence stops the job before its signal aborts', async () => {
      const survey = await createSurvey('Fence stops');
      await addResponses(survey, 3);

      // Two chunks; the first returns only after the cancel committed.
      let release!: () => void;
      gates.set(survey, new Promise((r) => (release = r)));
      const id = await jobs.enqueue('test.flaky', survey, '');
      await startedOf(id);
      await root.manager.transaction((tx) => jobs.invalidate(tx, 'test.flaky', survey, ''));
      release();
      await new Promise((r) => setTimeout(r, 1000));

      expect(chunks.get(id)).toBe(1);
      expect(await rowOf(id)).toEqual({ done: 0, total: 3 });
    });

    it('go with their response and their survey', async () => {
      const survey = await createSurvey('Cascade');
      const [a, b] = await addResponses(survey, 2);
      failing.set(a, 'bad').set(b, 'bad');
      await run(survey);
      expect((await failuresOf(survey)).length).toBe(2);

      await root.query(`DELETE FROM responses WHERE id = $1`, [a]);
      expect(await failuresOf(survey)).toEqual([{ id: b, error: 'bad' }]);

      await request(server()).delete(`/survey/${survey}`).set('Authorization', BEARER).expect(204);
      expect(await failuresOf(survey)).toEqual([]);
    });

    it('GET failures pages them; both endpoints check the kind and its roles', async () => {
      const survey = await createSurvey('Endpoints');
      const [a, b] = await addResponses(survey, 2);
      failing.set(a, 'bad a').set(b, 'bad b');
      await run(survey);
      const url = `/survey/${survey}/jobs/failures`;

      const page = async (n: number) =>
        (
          await request(server())
            .get(url)
            .query({ kind: 'test.flaky', subjectKey: '', page: n, perPage: 1 })
            .set('Authorization', BEARER)
            .expect(200)
        ).body;
      expect(await page(1)).toMatchObject({
        totalCount: 2,
        failures: [{ responseId: a, error: 'bad a', failedAt: expect.any(String) }],
      });
      expect((await page(2)).failures).toMatchObject([{ responseId: b }]);

      await request(server())
        .get(url)
        .query({ kind: 'test.flaky', subjectKey: '' })
        .set('Authorization', ANALYST)
        .expect(403);
      await retry(survey, ANALYST).expect(403);
      await request(server())
        .get(url)
        .query({ kind: 'test.nope', subjectKey: '' })
        .set('Authorization', BEARER)
        .expect(404);
      await request(server())
        .get(url)
        .query({ kind: 'test.flaky' })
        .set('Authorization', BEARER)
        .expect(400);
    });
  });

  it('GET jobs is 400 for a malformed survey id and 404 for an unknown one', async () => {
    await request(server()).get('/survey/nope/jobs').set('Authorization', BEARER).expect(400);
    await request(server())
      .get('/survey/10000000-0000-0000-0000-00000000ffff/jobs')
      .set('Authorization', BEARER)
      .expect(404);
  });
});
