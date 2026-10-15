import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { runValidate } from '../src/engine/engine-runtime';
import { FILE_HELPER, FileHelper } from '../src/integrations/filesystem/file-helper';
import { SurveyFolder } from '../src/integrations/filesystem/survey-folder';
import { CalculationsRepository } from '../src/modules/calculations/calculations.repository';
import { bearer, startTestApp, TestApp } from './harness';

const BEARER = bearer({ authorities: ['super_admin'] });

// A processed design with a number question, Q880htp.
const DESIGN_JSON = JSON.stringify(
  runValidate(readFileSync(`${__dirname}/fixtures/survey-design.json`, 'utf8')),
);

/**
 * Calculated-fields storage against a real Postgres: the migration, the
 * optimistic-locking save (which resets the status to idle), the Compute run
 * state (start, identity, 2-minute expiry), the guarded result writes into
 * `responses.computations`, and the survey lifecycle (clone, export → import,
 * delete).
 */
describe('Calculations storage', () => {
  let ctx: TestApp;
  let app: INestApplication;
  let root: DataSource;
  let repo: CalculationsRepository;

  beforeAll(async () => {
    ctx = await startTestApp();
    app = ctx.app;
    root = ctx.root;
    repo = app.get(CalculationsRepository);
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const server = () => app.getHttpServer();

  /** Create a survey whose latest design is the fixture. */
  const createSurvey = async (name: string): Promise<string> => {
    const created = await request(server())
      .post('/survey/create')
      .set('Authorization', BEARER)
      .send({ name })
      .expect(200);
    const id = created.body.id as string;
    await app
      .get<FileHelper>(FILE_HELPER)
      .uploadText(id, SurveyFolder.Design, DESIGN_JSON, '1');
    return id;
  };

  /** Create a survey with a saved one-calculation set (revision 1). */
  const surveyWithSet = async (name: string): Promise<string> => {
    const id = await createSurvey(name);
    await repo.saveSet(id, [calc('a', '1')], 0);
    return id;
  };

  const calc = (code: string, expression: string) => ({
    code,
    label: `${code} label`,
    expression,
    errors: [],
  });

  /** Move the row's run start back by `seconds`, to simulate elapsed time. */
  const ageRun = (surveyId: string, seconds: number) =>
    root.query(
      `UPDATE survey_calculations
       SET started_at = started_at - make_interval(secs => $2)
       WHERE survey_id = $1`,
      [surveyId, seconds],
    );

  const addResponse = (id: string, surveyId: string) =>
    root.query(
      `INSERT INTO responses
         (id, version, survey_id, preview, nav_index, start_date, submit_date,
          lang, events, "values")
       VALUES ($1,1,$2,false,'','2024-01-01 00:00:00','2024-02-01 00:00:00',
               'en','[]'::jsonb,'{}'::jsonb)`,
      [id, surveyId],
    );

  /** A response's stored `computations` (null when never written). */
  const computationsOf = async (id: string) =>
    (
      await root.query(`SELECT computations FROM responses WHERE id = $1`, [id])
    )[0].computations;

  describe('saveSet', () => {
    it('inserts on the first save and bumps the revision after', async () => {
      const id = await createSurvey('Save');
      expect(await repo.find(id)).toBeNull();

      expect(await repo.saveSet(id, [calc('a', '1')], 0)).toBe(1);
      expect(await repo.saveSet(id, [calc('b', '2')], 1)).toBe(2);

      expect(await repo.find(id)).toMatchObject({
        revision: 2,
        status: 'idle',
        startedAt: null,
        calculations: [calc('b', '2')],
      });
    });

    it('rejects a stale revision with 409', async () => {
      const id = await surveyWithSet('Stale');

      for (const stale of [0, 2]) {
        await expect(
          repo.saveSet(id, [calc('x', '1')], stale),
        ).rejects.toMatchObject({ status: 409 });
      }
      expect((await repo.find(id))?.calculations).toEqual([calc('a', '1')]);
    });
  });

  describe('Compute run state', () => {
    it('startRun starts one run at a time', async () => {
      const id = await surveyWithSet('Start');

      const startedAt = await repo.startRun(id, 4);
      expect(startedAt).toEqual(expect.any(String));
      expect(await repo.find(id)).toMatchObject({
        status: 'running',
        progressDone: 0,
        progressTotal: 4,
      });
      expect(await repo.startRun(id, 4)).toBeNull();
    });

    it('startRun returns null for a survey without a row', async () => {
      expect(await repo.startRun(await createSurvey('No row'), 1)).toBeNull();
    });

    it('updateRun only updates the current run', async () => {
      const id = await surveyWithSet('Update');
      const startedAt = (await repo.startRun(id, 4))!;

      expect(await repo.updateRun(id, startedAt, { progressDone: 2 })).toBe(true);
      expect(await repo.find(id)).toMatchObject({ status: 'running', progressDone: 2 });

      expect(await repo.updateRun(id, startedAt, { status: 'completed' })).toBe(true);
      // Finished: the run is no longer current, so further writes are refused.
      expect(await repo.updateRun(id, startedAt, { progressDone: 3 })).toBe(false);
      expect(await repo.find(id)).toMatchObject({ status: 'completed', progressDone: 2 });
    });

    it('a run past 2 minutes is expired on read and can be replaced', async () => {
      const id = await surveyWithSet('Expire');
      const first = (await repo.startRun(id, 4))!;

      // Within the limit: nothing changes.
      await ageRun(id, 60);
      await repo.expireStaleRun(id);
      expect((await repo.find(id))?.status).toBe('running');

      // Past the limit: failed, and the old run's writes are refused.
      await ageRun(id, 61);
      await repo.expireStaleRun(id);
      expect((await repo.find(id))?.status).toBe('failed');
      const aged = (
        await root.query(
          `SELECT started_at::text AS s FROM survey_calculations WHERE survey_id = $1`,
          [id],
        )
      )[0].s as string;
      expect(await repo.updateRun(id, aged, { progressDone: 1 })).toBe(false);

      const second = await repo.startRun(id, 4);
      expect(second).not.toBeNull();
      expect(second).not.toBe(first);
    });

    it('startRun replaces a running row past 2 minutes, even before it is expired', async () => {
      const id = await surveyWithSet('Replace');
      await repo.startRun(id, 4);
      await ageRun(id, 121);

      expect(await repo.startRun(id, 4)).not.toBeNull();
    });

    it('resetRunningOnBoot turns running into failed', async () => {
      const id = await surveyWithSet('Boot');
      await repo.startRun(id, 3);

      await repo.resetRunningOnBoot();

      expect((await repo.find(id))?.status).toBe('failed');
    });
  });

  describe('writeComputations', () => {
    const [r1, r2, r3] = [
      '30000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000003',
    ];

    it('writes for the current run, replacing earlier results', async () => {
      const id = await surveyWithSet('Write');
      await addResponse(r1, id);
      await addResponse(r2, id);
      const startedAt = (await repo.startRun(id, 2))!;

      expect(
        await repo.writeComputations(
          id,
          [
            { id: r1, computations: { a: 1 } },
            { id: r2, computations: { a: '#ERROR' } },
          ],
          startedAt,
        ),
      ).toBe(2);
      expect(await computationsOf(r1)).toEqual({ a: 1 });
      expect(await computationsOf(r2)).toEqual({ a: '#ERROR' });

      await repo.writeComputations(id, [{ id: r1, computations: { a: 5 } }], startedAt);
      expect(await computationsOf(r1)).toEqual({ a: 5 });
    });

    it('writes nothing for a run that is no longer current', async () => {
      const id = await surveyWithSet('Stale run');
      await addResponse(r3, id);
      const old = (await repo.startRun(id, 1))!;
      await ageRun(id, 121);
      await repo.startRun(id, 1);

      // `old` was taken before ageRun, so it matches neither run.
      expect(
        await repo.writeComputations(id, [{ id: r3, computations: { a: 1 } }], old),
      ).toBe(0);
      expect(await computationsOf(r3)).toBeNull();
    });

    it('a save sets the status back to idle and leaves results in place', async () => {
      const id = await surveyWithSet('Save hides');
      const r4 = '30000000-0000-0000-0000-000000000004';
      await addResponse(r4, id);
      const startedAt = (await repo.startRun(id, 1))!;
      await repo.writeComputations(id, [{ id: r4, computations: { a: 1 } }], startedAt);
      await repo.updateRun(id, startedAt, { progressDone: 1, status: 'completed' });

      await repo.saveSet(id, [calc('a', '2')], 1);

      expect((await repo.find(id))?.status).toBe('idle');
      expect(await computationsOf(r4)).toEqual({ a: 1 });
    });

    it("never writes another survey's responses", async () => {
      const id = await surveyWithSet('Own responses');
      const other = await surveyWithSet('Other survey');
      const r5 = '30000000-0000-0000-0000-000000000005';
      await addResponse(r5, other);
      const startedAt = (await repo.startRun(id, 1))!;

      expect(
        await repo.writeComputations(id, [{ id: r5, computations: { a: 1 } }], startedAt),
      ).toBe(0);
      expect(await computationsOf(r5)).toBeNull();
    });
  });

  describe('survey lifecycle', () => {
    const exportThenImport = async (id: string): Promise<string> => {
      const exported = await request(server())
        .get(`/survey/${id}/export`)
        .set('Authorization', BEARER)
        .responseType('blob')
        .expect(200);
      const imported = await request(server())
        .post('/survey/import')
        .set('Authorization', BEARER)
        .attach('file', exported.body as Buffer, 'survey.zip')
        .expect(200);
      return imported.body.id as string;
    };

    it('clone copies the set at revision 0 and idle', async () => {
      const id = await surveyWithSet('Clone source');
      await repo.saveSet(id, [calc('a', '1')], 1);
      await repo.startRun(id, 2);

      const cloned = await request(server())
        .post(`/survey/${id}/clone`)
        .set('Authorization', BEARER)
        .expect(200);

      expect(await repo.find(cloned.body.id)).toMatchObject({
        revision: 0,
        status: 'idle',
        startedAt: null,
        calculations: [calc('a', '1')],
      });
      // A first save on the clone (sent at revision 0) goes through.
      expect(await repo.saveSet(cloned.body.id, [calc('b', '2')], 0)).toBe(1);
    });

    it('export drops errors; import re-validates and drops invalid calculations', async () => {
      const id = await createSurvey('Export');
      // Stored directly, so the set can hold invalid calculations and a
      // made-up error that must not travel.
      await repo.saveSet(
        id,
        [
          { ...calc('double', 'Q880htp.value * 2'), errors: [{ name: 'InvalidCode' }] },
          calc('unknown', 'Q999.value'),
          calc('Bad', '1'),
        ],
        0,
      );

      expect(await repo.find(await exportThenImport(id))).toMatchObject({
        revision: 0,
        status: 'idle',
        calculations: [calc('double', 'Q880htp.value * 2')],
      });
    });

    it('import enforces the limits: long expressions dropped, first 10 kept', async () => {
      const id = await createSurvey('Limits');
      const valid = Array.from({ length: 12 }, (_, i) => calc(`c${i}`, `${i}`));
      await repo.saveSet(id, [calc('long', `1 + ${'1'.repeat(500)}`), ...valid], 0);

      expect((await repo.find(await exportThenImport(id)))?.calculations).toEqual(
        valid.slice(0, 10),
      );
    });

    it('deleting a survey removes its calculations', async () => {
      const id = await surveyWithSet('Delete');

      await request(server())
        .delete(`/survey/${id}`)
        .set('Authorization', BEARER)
        .expect(204);

      expect(await repo.find(id)).toBeNull();
    });
  });
});
