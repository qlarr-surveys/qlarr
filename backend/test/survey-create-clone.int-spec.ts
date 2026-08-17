import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { bearer, startTestApp, TestApp } from './harness';

const SRC = '10000000-0000-0000-0000-000000000001';

const token = (roles: string[]) => bearer({ authorities: roles });
const SUPER = token(['super_admin']);
const SURVEYOR = token(['surveyor']);

const files = {
  uploadText: jest.fn().mockResolvedValue(undefined),
  cloneResources: jest.fn().mockResolvedValue(undefined),
  copyDesign: jest.fn().mockResolvedValue(undefined),
  deleteSurveyFiles: jest.fn().mockResolvedValue(undefined),
};

describe('Survey create + clone', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(files),
    });
    app = ctx.app;
    root = ctx.root;

    // A source survey (with a version + one autocomplete row) to clone.
    await root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
          record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,true,'Original',-1,'ACTIVE','MIXED','2024-01-01 00:00:00','2024-01-01 00:00:00',
               true,true,true,true)`,
      [SRC],
    );
    await root.query(
      `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
       VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,true)`,
      [SRC],
    );
    await root.query(
      `INSERT INTO auto_complete (survey_id, component_id, data, filename)
       VALUES ($1,'Q1','["a","b"]'::jsonb,'ac.json')`,
      [SRC],
    );
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const server = () => app.getHttpServer();

  describe('POST /survey/create', () => {
    it('creates a survey with a seeded design and a version', async () => {
      const res = await request(server())
        .post('/survey/create')
        .set('Authorization', SUPER)
        .send({ name: 'Fresh Survey' })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Fresh Survey', status: 'draft' });

      // Survey + version 1 persisted; the design was stored to S3.
      const [v] = await root.query(
        `SELECT version, sub_version FROM versions WHERE survey_id = $1`,
        [res.body.id],
      );
      expect(v.version).toBe(1);
      expect(v.sub_version).toBe(2); // seeded 1, then setDesign bumps it
      expect(files.uploadText).toHaveBeenCalled();
    });

    it('makes duplicate names unique with a (n) suffix', async () => {
      await request(server()).post('/survey/create').set('Authorization', SUPER)
        .send({ name: 'Dup' }).expect(200);
      const res = await request(server()).post('/survey/create').set('Authorization', SUPER)
        .send({ name: 'Dup' }).expect(200);
      expect(res.body.name).toBe('Dup(1)');
    });

    it('400 for an invalid (empty) name', () =>
      request(server()).post('/survey/create').set('Authorization', SUPER).send({ name: '  ' }).expect(400));

    it('403 for a non-admin role', () =>
      request(server()).post('/survey/create').set('Authorization', SURVEYOR).send({ name: 'X' }).expect(403));
  });

  describe('POST /survey/:id/clone', () => {
    it('clones the survey, resources, design and autocomplete', async () => {
      const res = await request(server())
        .post(`/survey/${SRC}/clone`)
        .set('Authorization', SUPER)
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Original(1)', status: 'draft' });
      expect(res.body.id).not.toBe(SRC);

      expect(files.cloneResources).toHaveBeenCalledWith(SRC, res.body.id);
      expect(files.copyDesign).toHaveBeenCalledWith(SRC, res.body.id, '1', '1');

      // A version row + copied autocomplete row exist for the clone.
      const [v] = await root.query(
        `SELECT version FROM versions WHERE survey_id = $1`,
        [res.body.id],
      );
      expect(v.version).toBe(1);
      const ac = await root.query(
        `SELECT component_id FROM auto_complete WHERE survey_id = $1`,
        [res.body.id],
      );
      expect(ac).toEqual([{ component_id: 'Q1' }]);
    });
  });
});
