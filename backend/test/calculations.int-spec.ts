import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EngineService } from '../src/engine/engine.service';
import { runValidate } from '../src/engine/engine-runtime';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { CalculationsRepository } from '../src/modules/calculations/calculations.repository';
import { CalculationsService } from '../src/modules/calculations/calculations.service';
import { bearer, startTestApp, TestApp } from './harness';

const SUPER = bearer({ authorities: ['super_admin'] });
const ANALYST = bearer({ authorities: ['analyst'] });
const SURVEYOR = bearer({ authorities: ['surveyor'] });

// Every design read (latest or published) resolves to the fixture, which has a
// number question, Q880htp.
const DESIGN_JSON = JSON.stringify(
  runValidate(readFileSync(`${__dirname}/fixtures/survey-design.json`, 'utf8')),
);
const files = { getText: jest.fn().mockResolvedValue(DESIGN_JSON) };

const DOUBLE = { code: 'double', label: 'Double', expression: 'Q880htp.value * 2' };
const FIXED = { code: 'fixed', label: 'Fixed', expression: 'Q880htp.value.toFixed(1)' };
const BAD_REF = { code: 'bad', label: 'Bad', expression: 'Q999.value' };

/**
 * The Calculated fields API end to end: state, Test, Save, Compute (the
 * background run), response review and both exports, against a real Postgres
 * with the engine running in-process.
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

  const compute = (id: string) =>
    request(server()).post(`${base(id)}/compute`).set('Authorization', SUPER);

  const state = async (id: string) =>
    (await request(server()).get(base(id)).set('Authorization', SUPER).expect(200)).body;

  /** Poll until the run is no longer `running`. */
  const settle = async (id: string) => {
    for (let i = 0; i < 100; i++) {
      const s = await state(id);
      if (s.status !== 'running') return s;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error('run did not settle');
  };

  const calculationsOf = async (responseId: string) =>
    (
      await request(server())
        .get(`/response/${responseId}`)
        .set('Authorization', SUPER)
        .expect(200)
    ).body.calculations;

  describe('GET', () => {
    it('reports an idle, empty state for a survey never saved', async () => {
      const { id } = await createSurvey();
      expect(await state(id)).toEqual({
        calculations: [],
        revision: 0,
        status: 'idle',
        progress: { done: 0, total: 0 },
        startedAt: null,
        newSinceLastRun: null,
      });
    });

    it('404 for an unknown survey', () =>
      request(server())
        .get(base('10000000-0000-0000-0000-00000000ffff'))
        .set('Authorization', SUPER)
        .expect(404));

    it('reports a run past 2 minutes as failed', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await repo.startRun(id, 3);
      await root.query(
        `UPDATE survey_calculations SET started_at = started_at - interval '121 seconds'
         WHERE survey_id = $1`,
        [id],
      );
      expect((await state(id)).status).toBe('failed');
    });
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
        status: 'idle',
        progress: { done: 0, total: 0 },
        startedAt: null,
        newSinceLastRun: null,
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

    it('runs in the background; results show once it completes', async () => {
      const { id, r1, r2, r3, r4 } = await createSurvey();
      // BAD_REF has a validation error: it never runs and never shows.
      await save(id, [DOUBLE, BAD_REF, FIXED], 0).expect(200);

      const started = await compute(id).expect(200);
      expect(['running', 'completed']).toContain(started.body.status);
      expect(await settle(id)).toMatchObject({
        status: 'completed',
        progress: { done: 3, total: 3 },
        newSinceLastRun: 0,
      });

      expect(await calculationsOf(r1)).toEqual([
        { code: 'double', label: 'Double', state: 'value', value: 42 },
        { code: 'fixed', label: 'Fixed', state: 'value', value: '21.0' },
      ]);
      // No answer: NaN serializes to null (no value); reading a property of
      // undefined throws (error).
      expect(await calculationsOf(r2)).toEqual([
        { code: 'double', label: 'Double', state: 'empty', value: null },
        { code: 'fixed', label: 'Fixed', state: 'error', value: null },
      ]);
      expect(await calculationsOf(r3)).toEqual([]);
      expect((await calculationsOf(r4))[0]).toMatchObject({ state: 'value', value: 4 });
    });

    it('a save hides the results until the next Compute', async () => {
      const { id, r1 } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await compute(id).expect(200);
      await settle(id);

      await save(id, [DOUBLE], 1).expect(200);

      expect((await calculationsOf(r1))[0].state).toBe('not_computed');
      expect(await state(id)).toMatchObject({ status: 'idle', newSinceLastRun: null });
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
      expect((await state(id)).newSinceLastRun).toBe(1);
    });

    it('everything is refused (409) while a run is in progress', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      await repo.startRun(id, 3);

      await save(id, [FIXED], 1).expect(409);
      await request(server()).post(`${base(id)}/test`).set('Authorization', SUPER).expect(409);
      await compute(id).expect(409);
    });

    it('a chunk failure fails the whole run, and nothing is shown', async () => {
      const { id, r1 } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      jest
        .spyOn(app.get(EngineService), 'calculate')
        .mockRejectedValueOnce(new Error('engine timeout'));

      await compute(id).expect(200);

      expect((await settle(id)).status).toBe('failed');
      expect((await calculationsOf(r1))[0].state).toBe('not_computed');
    });

    it('a run past the time limit fails', async () => {
      const { id } = await createSurvey();
      await save(id, [DOUBLE], 0).expect(200);
      // The run reads its clock once to set the deadline, then before each
      // chunk: jump past 2 minutes after the first read.
      const now = Date.now();
      let reads = 0;
      jest
        .spyOn(app.get(CalculationsService) as unknown as { now: () => number }, 'now')
        .mockImplementation(() => (reads++ === 0 ? now : now + 121_000));

      await compute(id).expect(200);

      expect((await settle(id)).status).toBe('failed');
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
      expect(lines[0].endsWith(',double,fixed')).toBe(true);
      expect(lines.find((l) => l.includes(r1))!.endsWith('#NOT_COMPUTED,#NOT_COMPUTED')).toBe(true);

      await compute(id).expect(200);
      await settle(id);

      lines = await exportCsv(id, true);
      expect(lines.find((l) => l.includes(r1))!.endsWith(',42,21.0')).toBe(true);
      expect(lines.find((l) => l.includes(r2))!.endsWith(',,#ERROR')).toBe(true);
      // Incomplete: empty cells.
      expect(lines.find((l) => l.includes(r3))!.endsWith(',,')).toBe(true);

      const text = await exportCsv(id, false);
      expect(text[0].endsWith(',Double,Fixed')).toBe(true);
      expect(text.find((l) => l.includes(r1))!.endsWith(',42,21.0')).toBe(true);
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
    });
  });
});
