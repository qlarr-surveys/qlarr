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
 * optimistic-locking save, the result writes into `responses.computations`
 * (fenced by `results_epoch`) and clearing them, and the survey
 * lifecycle (clone, export → import, delete).
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

  /** An active Compute job row in pg-boss. */
  const addJob = (surveyId: string) =>
    root.query(
      `INSERT INTO pgboss.job (name, state, data)
       VALUES ('calc.compute', 'active', $1)`,
      [JSON.stringify({ surveyId, subjectKey: '' })],
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

  describe('writeComputations', () => {
    const [r1, r2, r3] = [
      '30000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000003',
    ];

    it('writes while the epoch is current, replacing earlier results', async () => {
      const id = await surveyWithSet('Write');
      await addResponse(r1, id);
      await addResponse(r2, id);

      expect(
        await repo.writeComputations(root.manager, 0, id, [
          { id: r1, computations: { a: 1 } },
          { id: r2, computations: { a: 2 } },
        ]),
      ).toEqual(expect.arrayContaining([r1, r2]));
      expect(await computationsOf(r1)).toEqual({ a: 1 });
      expect(await computationsOf(r2)).toEqual({ a: 2 });

      await repo.writeComputations(root.manager, 0, id, [{ id: r1, computations: { a: 5 } }]);
      expect(await computationsOf(r1)).toEqual({ a: 5 });
    });

    it('writes nothing once the results were cleared since', async () => {
      const id = await surveyWithSet('Stale epoch');
      await addResponse(r3, id);

      await repo.clearComputations(root.manager, id);
      expect((await repo.find(id))?.resultsEpoch).toBe(1);
      expect(
        await repo.writeComputations(root.manager, 0, id, [{ id: r3, computations: { a: 1 } }]),
      ).toEqual([]);
      expect(await computationsOf(r3)).toBeNull();
    });

    it('a clear committed while a results write waits leaves the write with nothing', async () => {
      const id = await surveyWithSet('Guarded');
      const r7 = '30000000-0000-0000-0000-000000000007';
      await addResponse(r7, id);

      const runner = root.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      await repo.clearComputations(runner.manager, id);
      const write = repo.writeComputations(root.manager, 0, id, [
        { id: r7, computations: { a: 1 } },
      ]);
      await new Promise((r) => setTimeout(r, 100));
      await runner.commitTransaction();
      await runner.release();

      expect(await write).toEqual([]);
      expect(await computationsOf(r7)).toBeNull();
    });

    it('clearComputations deletes the survey\'s results only', async () => {
      const id = await surveyWithSet('Clear');
      const other = await surveyWithSet('Clear other');
      const [r4, r6] = [
        '30000000-0000-0000-0000-000000000004',
        '30000000-0000-0000-0000-000000000006',
      ];
      await addResponse(r4, id);
      await addResponse(r6, other);
      await repo.writeComputations(root.manager, 0, id, [
        { id: r4, computations: { a: 1 } },
      ]);
      await repo.writeComputations(root.manager, 0, other, [
        { id: r6, computations: { a: 1 } },
      ]);

      await repo.clearComputations(root.manager, id);

      expect(await computationsOf(r4)).toBeNull();
      expect(await computationsOf(r6)).toEqual({ a: 1 });
    });

    it("never writes another survey's responses", async () => {
      const id = await surveyWithSet('Own responses');
      const other = await surveyWithSet('Other survey');
      const r5 = '30000000-0000-0000-0000-000000000005';
      await addResponse(r5, other);

      expect(
        await repo.writeComputations(root.manager, 0, id, [
          { id: r5, computations: { a: 1 } },
        ]),
      ).toEqual([]);
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

    it('clone copies the set at revision 0, without its jobs', async () => {
      const id = await surveyWithSet('Clone source');
      await repo.saveSet(id, [calc('a', '1')], 1);
      await addJob(id);

      const cloned = await request(server())
        .post(`/survey/${id}/clone`)
        .set('Authorization', BEARER)
        .expect(200);

      expect(await repo.find(cloned.body.id)).toMatchObject({
        revision: 0,
        calculations: [calc('a', '1')],
      });
      expect(
        await root.query(`SELECT 1 FROM pgboss.job WHERE data->>'surveyId' = $1`, [cloned.body.id]),
      ).toEqual([]);
      // A first save on the clone (sent at revision 0) goes through.
      expect(await repo.saveSet(cloned.body.id, [calc('b', '2')], 0)).toBe(1);
    });

    it('export drops errors; import re-validates and keeps invalid calculations with their errors', async () => {
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

      const row = await repo.find(await exportThenImport(id));
      expect(row).toMatchObject({ revision: 0 });
      // The made-up error is gone (re-validated); the invalid ones keep fresh errors.
      expect(row?.calculations.map((c) => [c.code, c.errors?.map((e) => e.name)])).toEqual([
        ['double', []],
        ['unknown', ['ScriptError']],
        ['Bad', ['InvalidCode']],
      ]);
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
