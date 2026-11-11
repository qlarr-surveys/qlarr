import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EngineService } from '../src/engine/engine.service';
import { runValidate } from '../src/engine/engine-runtime';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { DesignService } from '../src/modules/design/design.service';
import { CalculationsRepository } from '../src/modules/calculations/calculations.repository';
import { bearer, startTestApp, TestApp } from './harness';

const SUPER = bearer({ authorities: ['super_admin'] });
const ANALYST = bearer({ authorities: ['analyst'] });
const SURVEYOR = bearer({ authorities: ['surveyor'] });

// Every design read (latest or published) resolves to the fixture, which has a
// number question, Q880htp.
const DESIGN_JSON = JSON.stringify(
  runValidate(readFileSync(`${__dirname}/fixtures/survey-design.json`, 'utf8')),
);
const files = {
  getText: jest.fn().mockResolvedValue(DESIGN_JSON),
  uploadText: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
};

const DOUBLE = { code: 'double', label: 'Double', expression: 'Q880htp.value * 2' };
const FIXED = { code: 'fixed', label: 'Fixed', expression: 'Q880htp.value.toFixed(1)' };
const OUT_OF_DATE = { name: 'OutOfDate' };
const BAD_REF = { code: 'bad', label: 'Bad', expression: 'Q999.value' };

/**
 * The Calculated fields API end to end: state, Test, Save, Compute (a job, run
 * by this app's dispatcher), cancel, response review and both exports, against
 * a real Postgres with the engine running in-process.
 */
describe('Calculations', () => {
  let ctx: TestApp;
  let app: INestApplication;
  let root: DataSource;
  let repo: CalculationsRepository;
  let surveyCount = 0;

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(files),
    });
    app = ctx.app;
    root = ctx.root;
    repo = app.get(CalculationsRepository);
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  afterEach(() => jest.restoreAllMocks());

  const server = () => app.getHttpServer();
  const base = (id: string) => `/survey/${id}/calculations`;

  /**
   * A published survey with four responses: r1 (Q880htp = 21), r2 (no answer),
   * r3 (incomplete) and r4 (a preview, Q880htp = 2). Ids are unique per survey.
   */
  const createSurvey = async () => {
    surveyCount += 1;
    const suffix = String(surveyCount).padStart(2, '0');
    const id = `10000000-0000-0000-0000-0000000000${suffix}`;
    await root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
          record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,true,$2,-1,'ACTIVE','MIXED','2024-01-01 00:00:00','2024-01-01 00:00:00',
               true,true,true,true)`,
      [id, `s${suffix}`],
    );
    await root.query(
      `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
       VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,true)`,
      [id],
    );
    const rid = (n: number) => `20000000-0000-0000-0000-00000000${suffix}0${n}`;
    const responses = { r1: rid(1), r2: rid(2), r3: rid(3), r4: rid(4) };
    const add = (rid: string, values: object, submitted: boolean, preview = false) =>
      root.query(
        `INSERT INTO responses
           (id, version, survey_id, preview, nav_index, start_date, submit_date,
            lang, events, "values")
         VALUES ($1,1,$2,$3,'','2024-01-01 00:00:00',$4,'en','[]'::jsonb,$5::jsonb)`,
        [rid, id, preview, submitted ? '2024-02-01 00:00:00' : null, JSON.stringify(values)],
      );
    await add(responses.r1, { 'Q880htp.value': 21 }, true);
    await add(responses.r2, {}, true);
    await add(responses.r3, { 'Q880htp.value': 5 }, false);
    await add(responses.r4, { 'Q880htp.value': 2 }, true, true);
    return { id, ...responses };
  };

  const save = (id: string, calculations: object[], revision: number) =>
    request(server())
      .put(base(id))
      .set('Authorization', SUPER)
      .send({ calculations, revision });

  const rename = (id: string, from: string, to: string) =>
    request(server())
      .post(`/survey/${id}/change_code?from=${from}&to=${to}`)
      .set('Authorization', SUPER);

  const compute = (id: string) =>
    request(server()).post(`${base(id)}/compute`).set('Authorization', SUPER);

  const state = async (id: string) =>
    (await request(server()).get(base(id)).set('Authorization', SUPER).expect(200)).body;

  /** Poll until the job is neither waiting nor running. */
  const settle = async (id: string) => {
    for (let i = 0; i < 150; i++) {
      const s = await state(id);
      if (s.status !== 'waiting' && s.status !== 'running') return s;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('job did not settle');
  };

  /** The pg-boss state of the survey's most recent Compute job. */
  const lastJob = async (id: string): Promise<string> =>
    (
      await root.query(
        `SELECT state FROM pgboss.job
         WHERE name = 'calc.compute' AND data->>'surveyId' = $1
         ORDER BY created_on DESC LIMIT 1`,
        [id],
      )
    )[0].state;

  /** A Compute job row that looks active (no worker of this app runs it). */
  const runningJob = async (id: string): Promise<string> => {
    const [{ id: jobId }] = await root.query(
      `INSERT INTO pgboss.job (name, state, data, singleton_key, policy, started_on)
       VALUES ('calc.compute', 'active', $1, $2, 'exclusive', now()) RETURNING id`,
      [JSON.stringify({ surveyId: id, subjectKey: '' }), `${id}:`],
    );
    await root.query('INSERT INTO jobs (id, survey_id) VALUES ($1, $2)', [jobId, id]);
    return jobId;
  };

  const cancel = (id: string, jobId: string, auth = SUPER) =>
    request(server()).post(`/survey/${id}/jobs/${jobId}/cancel`).set('Authorization', auth);

  const calculationsOf = async (responseId: string) =>
    (
      await request(server())
        .get(`/response/${responseId}`)
        .set('Authorization', SUPER)
        .expect(200)
    ).body.calculations;

  describe('GET', () => {
    it('reports an empty state for a survey never saved', async () => {
      const { id } = await createSurvey();
      expect(await state(id)).toEqual({
        calculations: [],
        revision: 0,
        jobId: null,
        status: 'none',
        error: null,
        errorCode: null,
        startedAt: null,
        progress: null,
        failedCount: 0,
        uncomputedCount: 3,
      });
    });

    it('404 for an unknown survey', () =>
      request(server())
        .get(base('10000000-0000-0000-0000-00000000ffff'))
        .set('Authorization', SUPER)
        .expect(404));
  });

  describe('Test', () => {
    it('runs the saved set on the sample without validating; nothing is stored', async () => {
      const { id, r1, r2, r4 } = await createSurvey();
      await save(id, [DOUBLE, FIXED, BAD_REF], 0).expect(200);
      const before = await repo.find(id);

      const res = await request(server())
        .post(`${base(id)}/test`)
        .set('Authorization', ANALYST)
        .expect(200);

      const byId = Object.fromEntries(
        res.body.sample.map((s: { responseId: string }) => [s.responseId, s]),
      );
      expect(Object.keys(byId).sort()).toEqual([r1, r2, r4].sort());
      // The invalid calculation never runs.
      expect(byId[r1]).toMatchObject({ results: { double: 42, fixed: '21.0' }, errors: {} });
      expect(byId[r2].results).toEqual({});
      expect(Object.keys(byId[r2].errors)).toEqual(['fixed']);
      expect(byId[r2].errors.fixed.name).toBe('TypeError');
      expect(byId[r4].preview).toBe(true);

      expect(await repo.find(id)).toEqual(before);
    });

    it('400 when nothing is saved', async () => {
      const { id } = await createSurvey();
      await request(server()).post(`${base(id)}/test`).set('Authorization', SUPER).expect(400);
    });
  });

  describe('Save', () => {
    it('stores the whole set, invalid calculations with their errors, and returns the state', async () => {
      const { id, r1 } = await createSurvey();
      const res = await save(
        id,
        [DOUBLE, { code: 'Bad', label: 'B', expression: '1' }],
        0,
      ).expect(200);
      expect(res.body).toEqual({
        calculations: [
          { ...DOUBLE, errors: [] },
          { code: 'Bad', label: 'B', expression: '1', errors: [{ name: 'InvalidCode' }] },
        ],
        revision: 1,
        jobId: null,
        status: 'none',
        error: null,
        errorCode: null,
        startedAt: null,
        progress: null,
        failedCount: 0,
        uncomputedCount: 3,
      });
      expect((await state(id)).calculations[1].errors).toEqual([{ name: 'InvalidCode' }]);
      // Only the valid calculation shows on responses.
      expect(await calculationsOf(r1)).toEqual([
        { code: 'double', label: 'Double', state: 'not_computed', value: null },
      ]);
    });

    it('409 on a stale revision', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await save(id, [FIXED], 0).expect(409);
    });

    it('400 for more than 10 calculations or an expression over 500 characters', async () => {
      const { id } = await createSurvey();
      const many = Array.from({ length: 11 }, (_, i) => ({ code: `c${i}`, label: 'L', expression: '1' }));
      await save(id, many, 0).expect(400);
      await save(id, [{ code: 'a', label: 'L', expression: '1'.repeat(501) }], 0).expect(400);
    });
  });

  describe('Compute', () => {
    it('400 when there is nothing to compute', async () => {
      const { id } = await createSurvey();
      await compute(id).expect(400);
    });

    it('runs as a job; results show as it writes them', async () => {
      const { id, r1, r2, r3, r4 } = await createSurvey();
      // BAD_REF has a validation error: it never runs and never shows.
      await save(id, [DOUBLE, BAD_REF, FIXED], 0).expect(200);

      const started = await compute(id).expect(200);
      expect(started.body).toMatchObject({ status: 'waiting', jobId: expect.any(String) });
      expect(await settle(id)).toMatchObject({
        status: 'completed_with_failures',
        failedCount: 1,
        uncomputedCount: 0,
      });
      expect(await lastJob(id)).toBe('completed');

      expect(await calculationsOf(r1)).toEqual([
        { code: 'double', label: 'Double', state: 'value', value: 42 },
        { code: 'fixed', label: 'Fixed', state: 'value', value: '21.0' },
      ]);
      // No answer: reading a property of undefined throws, so the response is
      // a failure (with the engine's message) and gets no results at all.
      expect(await calculationsOf(r2)).toEqual([
        { code: 'double', label: 'Double', state: 'not_computed', value: null },
        { code: 'fixed', label: 'Fixed', state: 'not_computed', value: null },
      ]);
      const [failure] = await root.query(
        `SELECT response_id AS id, error FROM job_failures WHERE survey_id = $1`,
        [id],
      );
      expect(failure).toEqual({ id: r2, error: expect.stringMatching(/^Fixed \(fixed\): TypeError: /) });
      expect(await calculationsOf(r3)).toEqual([]);
      expect((await calculationsOf(r4))[0]).toMatchObject({ state: 'value', value: 4 });
    });

    it('a save deletes the results', async () => {
      const { id, r1 } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await compute(id).expect(200);
      await settle(id);

      await save(id, [DOUBLE], 1).expect(200);

      expect((await calculationsOf(r1))[0].state).toBe('not_computed');
      expect(await state(id)).toMatchObject({ status: 'none', uncomputedCount: 3 });
    });

    it('a response submitted after the run shows not computed', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await compute(id).expect(200);
      await settle(id);
      const late = `21000000-0000-0000-0000-0000000000${String(surveyCount).padStart(2, '0')}`;
      await root.query(
        `INSERT INTO responses
           (id, version, survey_id, preview, nav_index, start_date, submit_date,
            lang, events, "values")
         VALUES ($1,1,$2,false,'','2024-01-01 00:00:00','2024-03-01 00:00:00','en',
                 '[]'::jsonb,'{"Q880htp.value": 1}'::jsonb)`,
        [late, id],
      );

      expect((await calculationsOf(late))[0].state).toBe('not_computed');
      expect((await state(id)).uncomputedCount).toBe(1);
    });

    it('Compute only runs the responses without results', async () => {
      const { id, r1 } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await compute(id).expect(200);
      await settle(id);
      const late = `22000000-0000-0000-0000-0000000000${String(surveyCount).padStart(2, '0')}`;
      await root.query(
        `INSERT INTO responses
           (id, version, survey_id, preview, nav_index, start_date, submit_date,
            lang, events, "values")
         VALUES ($1,1,$2,false,'','2024-01-01 00:00:00','2024-03-01 00:00:00','en',
                 '[]'::jsonb,'{"Q880htp.value": 1}'::jsonb)`,
        [late, id],
      );
      const calculate = jest.spyOn(app.get(EngineService), 'calculate');

      await compute(id).expect(200);

      expect(await settle(id)).toMatchObject({ status: 'none', uncomputedCount: 0 });
      expect(await lastJob(id)).toBe('completed');
      expect(Object.keys(calculate.mock.calls[0][2])).toEqual([late]);
      expect((await calculationsOf(late))[0]).toMatchObject({ state: 'value', value: 2 });
      expect((await calculationsOf(r1))[0]).toMatchObject({ state: 'value', value: 42 });
    });

    it('a design save deletes the results, and the next Compute runs everything', async () => {
      const { id, r1 } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await compute(id).expect(200);
      await settle(id);

      await app.get(DesignService).setDesign(id, {}, 1);

      expect(await calculationsOf(r1)).toEqual([]);
      expect(await state(id)).toMatchObject({ status: 'none', uncomputedCount: 3 });
      await save(id, [DOUBLE], 1).expect(200);
      await compute(id).expect(200);
      await settle(id);
      expect(await lastJob(id)).toBe('completed');
    });

    it('a job runs at most 10K responses; the next Compute runs the rest', async () => {
      const { id } = await createSurvey();
      // 3 completed responses already, plus 9,998: 10,001 in all.
      await root.query(
        `INSERT INTO responses
           (id, version, survey_id, preview, nav_index, start_date, submit_date,
            lang, events, "values")
         SELECT gen_random_uuid(), 1, $1, false, '', '2024-01-01 00:00:00',
                '2024-02-01 00:00:00', 'en', '[]'::jsonb, '{"Q880htp.value": 1}'::jsonb
         FROM generate_series(1, 9998)`,
        [id],
      );
      await save(id, [DOUBLE], 0).expect(200);

      await compute(id).expect(200);
      expect(await settle(id)).toMatchObject({ status: 'none', uncomputedCount: 1 });
      expect(await lastJob(id)).toBe('completed');

      await compute(id).expect(200);
      expect(await settle(id)).toMatchObject({ status: 'none', uncomputedCount: 0 });
      expect(await lastJob(id)).toBe('completed');
    });

    it('a code rename rewrites the expressions and bumps the revision', async () => {
      const { id } = await createSurvey();
      const similar = { code: 'similar', label: 'Similar', expression: 'Q880htpx.value' };
      await save(id, [DOUBLE, similar], 0).expect(200);

      await rename(id, 'Q880htp', 'Q880new').expect(201);

      const after = await state(id);
      expect(after.calculations[0]).toMatchObject({
        expression: 'Q880new.value * 2',
        errors: [OUT_OF_DATE],
      });
      expect(after.calculations[1].expression).toBe('Q880htpx.value');
      expect(after.revision).toBe(2);
      await save(id, [DOUBLE], 1).expect(409);
    });

    it('a code rename no calculation references keeps the revision', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);

      await rename(id, 'G2', 'G9').expect(201);

      expect(await state(id)).toMatchObject({
        revision: 1,
        calculations: [{ expression: DOUBLE.expression }],
      });
    });

    it('a design change marks every calculation out of date, once, keeping its other errors', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE, BAD_REF], 0).expect(200);
      const design = app.get(DesignService);

      await design.setDesign(id, {}, 1);
      await design.setDesign(id, {}, 2);

      const { calculations, revision } = await state(id);
      expect(calculations[0].errors).toEqual([OUT_OF_DATE]);
      expect(calculations[1].errors).toEqual([
        expect.objectContaining({ name: 'ScriptError' }),
        OUT_OF_DATE,
      ]);
      expect(revision).toBe(1);
    });

    it('out of date calculations hide from responses, and a Save brings them back', async () => {
      const { id, r1 } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await app.get(DesignService).setDesign(id, {}, 1);
      expect(await calculationsOf(r1)).toEqual([]);

      await save(id, [DOUBLE], 1).expect(200);

      expect((await state(id)).calculations[0].errors).toEqual([]);
      expect((await calculationsOf(r1))[0].state).toBe('not_computed');
    });

    it('Test runs nothing on out of date calculations', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await app.get(DesignService).setDesign(id, {}, 1);

      const { body } = await request(server())
        .post(`${base(id)}/test`)
        .set('Authorization', SUPER)
        .expect(200);
      expect(body.sample[0]).toMatchObject({ results: {}, errors: {} });
    });

    it('Compute runs nothing on out of date calculations', async () => {
      const { id, r1 } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await app.get(DesignService).setDesign(id, {}, 1);

      await compute(id).expect(200);

      expect((await settle(id)).status).toBe('none');
      expect(await lastJob(id)).toBe('completed');
      expect(await calculationsOf(r1)).toEqual([]);
    });

    it('discarding unpublished changes marks the calculations out of date', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      const design = app.get(DesignService);
      await design.setDesign(id, {}, 1);
      await save(id, [DOUBLE], 1).expect(200);

      await design.restorePublished(id, 2, 1);

      expect((await state(id)).calculations[0].errors).toEqual([OUT_OF_DATE]);
    });

    it('discarding unpublished changes deletes the results', async () => {
      const { id, r1 } = await createSurvey();
      const design = app.get(DesignService);
      await design.setDesign(id, {}, 1);
      await save(id, [DOUBLE], 0).expect(200);
      await compute(id).expect(200);
      await settle(id);

      await design.restorePublished(id, 2, 1);

      expect(await calculationsOf(r1)).toEqual([]);
      expect(await state(id)).toMatchObject({ status: 'none', uncomputedCount: 3 });
    });

    it('a second Compute is refused (409) while one is active', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      const jobId = await runningJob(id);

      expect(await state(id)).toMatchObject({ status: 'running', jobId });
      const res = await compute(id).expect(409);
      expect(res.body.error).toBe('JobAlreadyActiveException');
    });

    it('Save and Test are allowed while a job runs; a Save cancels it', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await runningJob(id);

      await request(server()).post(`${base(id)}/test`).set('Authorization', SUPER).expect(200);
      await save(id, [FIXED], 1).expect(200);

      expect(await lastJob(id)).toBe('cancelled');
      expect((await state(id)).status).toBe('none');
    });

    it('a design change cancels the job', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await runningJob(id);

      await app.get(DesignService).setDesign(id, {}, 1);

      expect(await lastJob(id)).toBe('cancelled');
    });

    it('cancel stops the job and keeps the results it wrote', async () => {
      const { id, r1 } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await compute(id).expect(200);
      await settle(id);
      const jobId = await runningJob(id);

      const res = await cancel(id, jobId).expect(200);

      expect(res.body).toMatchObject({ status: 'none', jobId: null });
      expect(await lastJob(id)).toBe('cancelled');
      expect((await calculationsOf(r1))[0]).toMatchObject({ state: 'value', value: 42 });
    });

    it("cancel is 404 for another survey's job", async () => {
      const { id } = await createSurvey();
      const other = await createSurvey();
      await save(other.id, [DOUBLE], 0).expect(200);
      const jobId = await runningJob(other.id);

      await cancel(id, jobId).expect(404);
      expect(await lastJob(other.id)).toBe('active');
      await cancel(other.id, jobId).expect(200);
    });

    it('lists the Compute subject on the jobs endpoint', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await compute(id).expect(200);
      await settle(id);

      const { body } = await request(server())
        .get(`/survey/${id}/jobs`)
        .set('Authorization', ANALYST)
        .expect(200);
      expect(body).toEqual([
        {
          kind: 'calc.compute',
          subjectKey: '',
          jobId: null,
          status: 'none',
          error: null,
          errorCode: null,
          startedAt: null,
          progress: null,
          failedCount: 0,
          hasResults: true,
        },
      ]);
      const surveyor = await request(server())
        .get(`/survey/${id}/jobs`)
        .set('Authorization', SURVEYOR)
        .expect(200);
      expect(surveyor.body).toEqual([]);
    });

    it('a chunk failure fails the job, with its error', async () => {
      const { id, r1 } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      jest
        .spyOn(app.get(EngineService), 'calculate')
        .mockRejectedValueOnce(new Error('engine timeout'));

      await compute(id).expect(200);

      expect(await settle(id)).toMatchObject({
        status: 'failed',
        error: 'engine timeout',
        errorCode: 'job_error',
      });
      expect((await calculationsOf(r1))[0].state).toBe('not_computed');
    });

    it('a response with no result is a failure: the next Compute skips it, a retry runs it', async () => {
      const { id, r1, r2 } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      const engine = app.get(EngineService);
      const calculate = engine.calculate.bind(engine);
      jest.spyOn(engine, 'calculate').mockImplementationOnce(async (...args) => {
        const { [r1]: _dropped, ...rest } = await calculate(...args);
        return rest;
      });

      await compute(id).expect(200);

      expect(await settle(id)).toMatchObject({
        status: 'completed_with_failures',
        failedCount: 1,
        uncomputedCount: 0,
      });
      expect((await calculationsOf(r1))[0].state).toBe('not_computed');
      expect((await calculationsOf(r2))[0].state).not.toBe('not_computed');

      await request(server())
        .post(`/survey/${id}/jobs/retry`)
        .set('Authorization', ANALYST)
        .send({ kind: 'calc.compute', subjectKey: '' })
        .expect(200);

      expect(await settle(id)).toMatchObject({ status: 'none', failedCount: 0 });
      expect((await calculationsOf(r1))[0]).toMatchObject({ state: 'value', value: 42 });
    });

    it('a Save clears the failures', async () => {
      const { id, r1 } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      const engine = app.get(EngineService);
      const calculate = engine.calculate.bind(engine);
      jest.spyOn(engine, 'calculate').mockImplementationOnce(async (...args) => {
        const { [r1]: _dropped, ...rest } = await calculate(...args);
        return rest;
      });
      await compute(id).expect(200);
      expect(await settle(id)).toMatchObject({ failedCount: 1 });

      await save(id, [DOUBLE, FIXED], 1).expect(200);

      expect(await state(id)).toMatchObject({ status: 'none', failedCount: 0, uncomputedCount: 3 });
    });
  });

  describe('exports', () => {
    const exportCsv = async (id: string, dbValues: boolean) =>
      (
        await request(server())
          .get(`/survey/${id}/response/export/csv/0/999999?db_values=${dbValues}`)
          .set('Authorization', SUPER)
          .expect(200)
      ).text
        .trim()
        .split('\r\n');

    it('adds one column per valid calculation, after the regular columns', async () => {
      const { id, r1, r2, r3 } = await createSurvey();
      await save(id, [DOUBLE, BAD_REF, FIXED], 0).expect(200);

      // Before Compute: not computed.
      let lines = await exportCsv(id, true);
      expect(lines[0].endsWith(',Double,Fixed')).toBe(true);
      expect(lines.find((l) => l.includes(r1))!.endsWith('#NOT_COMPUTED,#NOT_COMPUTED')).toBe(true);

      await compute(id).expect(200);
      await settle(id);

      lines = await exportCsv(id, true);
      expect(lines.find((l) => l.includes(r1))!.endsWith(',42,21.0')).toBe(true);
      // Failed: no results.
      expect(lines.find((l) => l.includes(r2))!.endsWith('#NOT_COMPUTED,#NOT_COMPUTED')).toBe(true);
      // Incomplete: empty cells.
      expect(lines.find((l) => l.includes(r3))!.endsWith(',,')).toBe(true);

      const text = await exportCsv(id, false);
      expect(text[0].endsWith(',Double,Fixed')).toBe(true);
      expect(text.find((l) => l.includes(r1))!.endsWith(',42,21.0')).toBe(true);
    });

    it('picks header and value types independently', async () => {
      const { id } = await createSurvey();
      const exportWith = async (dbValues: boolean, headers?: string) =>
        (
          await request(server())
            .get(
              `/survey/${id}/response/export/csv/0/999999?db_values=${dbValues}` +
                (headers ? `&headers=${headers}` : ''),
            )
            .set('Authorization', SUPER)
            .expect(200)
        ).text.split('\r\n')[0];

      const codeDb = await exportWith(true);
      const textText = await exportWith(false);
      expect(codeDb).toContain('Q880htp.value');
      expect(textText).not.toContain('Q880htp.value');

      expect(await exportWith(true, 'code')).toBe(codeDb);
      expect(await exportWith(false, 'text')).toBe(textText);
      expect(await exportWith(false, 'code')).toContain('Q880htp.value');
      expect(await exportWith(true, 'text')).not.toContain('Q880htp.value');
    });
  });

  describe('roles', () => {
    it('403 for a surveyor on every route', async () => {
      const { id } = await createSurvey();
      await request(server()).get(base(id)).set('Authorization', SURVEYOR).expect(403);
      await request(server()).post(`${base(id)}/test`).set('Authorization', SURVEYOR).expect(403);
      await request(server())
        .put(base(id))
        .set('Authorization', SURVEYOR)
        .send({ calculations: [], revision: 0 })
        .expect(403);
      await request(server()).post(`${base(id)}/compute`).set('Authorization', SURVEYOR).expect(403);
      await save(id, [DOUBLE], 0).expect(200);
      await cancel(id, await runningJob(id), SURVEYOR).expect(403);
    });
  });
});
