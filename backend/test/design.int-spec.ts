import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EngineService } from '../src/engine/engine.service';
import { runValidate } from '../src/engine/engine-runtime';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { bearer, startTestApp, TestApp } from './harness';

const SURVEY = '10000000-0000-0000-0000-000000000001';
const SURVEY_CLOSED = '10000000-0000-0000-0000-000000000002';
const SURVEY_PUB = '10000000-0000-0000-0000-000000000003';
const SURVEY_OFF = '10000000-0000-0000-0000-000000000004';

const token = (roles: string[]) => bearer({ authorities: roles });
const SUPER = token(['super_admin']);
const SURVEYOR = token(['surveyor']);

// A real processed design (engine output) is what storage would hold.
const DESIGN_JSON = JSON.stringify(runValidate(new EngineService().newSurvey('Feedback')));

const files = {
  getText: jest.fn().mockResolvedValue(DESIGN_JSON),
  uploadText: jest.fn().mockResolvedValue(undefined),
  listSurveyResources: jest.fn().mockResolvedValue([]),
  surveyResourcesFiles: jest.fn().mockResolvedValue([
    { name: 'logo.png', size: 10, lastModified: '2024-06-01 00:00:00' },
  ]),
  delete: jest.fn().mockResolvedValue(undefined),
};

describe('Survey design (get + set)', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  const addSurvey = (id: string, status: string) =>
    root
      .query(
        `INSERT INTO surveys
           (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
            record_gps, save_ip, save_timings, background_audio)
         VALUES ($1,true,$2,-1,$3,'MIXED','2024-01-01 00:00:00','2024-01-01 00:00:00',
                 true,true,true,true)`,
        [id, `n-${id}`, status],
      )
      .then(() =>
        root.query(
          `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
           VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,false)`,
          [id],
        ),
      );

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(files),
    });
    app = ctx.app;
    root = ctx.root;

    await addSurvey(SURVEY, 'DRAFT');
    await addSurvey(SURVEY_CLOSED, 'CLOSED');
    await addSurvey(SURVEY_PUB, 'DRAFT');
    await addSurvey(SURVEY_OFF, 'ACTIVE');
    await root.query(
      `UPDATE versions SET published = true WHERE survey_id = $1`,
      [SURVEY_OFF],
    );
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    files.getText.mockResolvedValue(DESIGN_JSON);
    files.uploadText.mockResolvedValue(undefined);
    files.listSurveyResources.mockResolvedValue([]);
    files.surveyResourcesFiles.mockResolvedValue([
      { name: 'logo.png', size: 10, lastModified: '2024-06-01 00:00:00' },
    ]);
    files.delete.mockResolvedValue(undefined);
  });

  const server = () => app.getHttpServer();

  describe('GET /survey/:id/design', () => {
    it('returns the designer input + version metadata', async () => {
      const res = await request(server())
        .get(`/survey/${SURVEY}/design`)
        .set('Authorization', SUPER)
        .expect(200);
      expect(res.body.designerInput.state).toBeDefined();
      expect(Array.isArray(res.body.designerInput.componentIndexList)).toBe(true);
      expect(res.body.versionDto).toMatchObject({
        surveyId: SURVEY,
        version: 1,
        subVersion: 1,
        published: false,
        status: 'draft',
      });
    });

    it('403 for a non-admin role', () =>
      request(server()).get(`/survey/${SURVEY}/design`).set('Authorization', SURVEYOR).expect(403));

    it('401 unauthenticated', () =>
      request(server()).get(`/survey/${SURVEY}/design`).expect(401));
  });

  describe('POST /survey/:id/design', () => {
    it('validates + stores a new sub-version', async () => {
      const res = await request(server())
        .post(`/survey/${SURVEY}/design?version=1`)
        .set('Authorization', SUPER)
        .send({})
        .expect(201);

      // stored the processed design under version "1"
      expect(files.uploadText).toHaveBeenCalledTimes(1);
      const [sid, folder, body, filename] = files.uploadText.mock.calls[0];
      expect(sid).toBe(SURVEY);
      expect(folder.path).toBe('design');
      expect(filename).toBe('1');
      expect(() => JSON.parse(body)).not.toThrow();

      // sub-version bumped, still unpublished
      expect(res.body.versionDto).toMatchObject({ version: 1, subVersion: 2, published: false });
      const [row] = await root.query(
        `SELECT sub_version FROM versions WHERE survey_id = $1 AND version = 1`,
        [SURVEY],
      );
      expect(row.sub_version).toBe(2);
    });

    // Regression: the default body-parser 100kb cap 413'd every real design
    // save (the whole survey JSON) before the handler ran. A >100kb body must
    // now reach the pipeline — proven here by it getting past body-parser to
    // the auth guard (401, not a pre-handler 413).
    it('does not 413 a >100kb JSON body (raised body limit)', () =>
      request(server())
        .post(`/survey/${SURVEY}/design?version=1`)
        .send({ _pad: 'x'.repeat(300 * 1024) })
        .expect(401));

    it('400 when editing from a stale version', () =>
      request(server())
        .post(`/survey/${SURVEY}/design?version=99`)
        .set('Authorization', SUPER)
        .send({})
        .expect(400));

    it('400 when the survey is closed', () =>
      request(server())
        .post(`/survey/${SURVEY_CLOSED}/design?version=1`)
        .set('Authorization', SUPER)
        .send({})
        .expect(400));
  });

  describe('POST /survey/:id/change_code', () => {
    it('renames a component and stores a new version', async () => {
      const res = await request(server())
        .post(`/survey/${SURVEY}/change_code?from=G2&to=G9`)
        .set('Authorization', SUPER)
        .expect(201);
      // stored a design whose component index now has G9, not G1
      const stored = JSON.parse(files.uploadText.mock.calls[0][2]);
      const codes = stored.componentIndexList.map((c: { code: string }) => c.code);
      expect(codes).toContain('G9');
      expect(codes).not.toContain('G2');
      expect(res.body.versionDto.published).toBe(false);
    });

    it('400 on identical from/to', () =>
      request(server())
        .post(`/survey/${SURVEY}/change_code?from=G2&to=G2`)
        .set('Authorization', SUPER)
        .expect(400));

    it('400 when the from code does not exist', () =>
      request(server())
        .post(`/survey/${SURVEY}/change_code?from=Gnope&to=G9`)
        .set('Authorization', SUPER)
        .expect(400));

    it('403 for a non-admin role', () =>
      request(server())
        .post(`/survey/${SURVEY}/change_code?from=G2&to=G9`)
        .set('Authorization', SURVEYOR)
        .expect(403));
  });

  describe('POST /survey/:id/design/publish', () => {
    it('publishes the working version and activates the survey', async () => {
      const res = await request(server())
        .post(`/survey/${SURVEY_PUB}/design/publish?version=1&sub_version=1`)
        .set('Authorization', SUPER)
        .expect(201);
      expect(res.body).toMatchObject({ version: 1, published: true, status: 'active' });

      const [v] = await root.query(
        `SELECT published FROM versions WHERE survey_id = $1 AND version = 1`,
        [SURVEY_PUB],
      );
      expect(v.published).toBe(true);
      const [s] = await root.query(`SELECT status FROM surveys WHERE id = $1`, [SURVEY_PUB]);
      expect(s.status).toBe('ACTIVE');
    });

    it('400 when publishing a stale version', () =>
      request(server())
        .post(`/survey/${SURVEY_PUB}/design/publish?version=99&sub_version=1`)
        .set('Authorization', SUPER)
        .expect(400));
  });

  describe('POST /survey/:id/offline/design', () => {
    it('echoes the publish info when the client is up to date', async () => {
      const res = await request(server())
        .post(`/survey/${SURVEY_OFF}/offline/design`)
        .set('Authorization', SUPER)
        .send({ version: 1, subVersion: 1, lastModified: '2024-01-01 00:00:00' })
        .expect(201);
      expect(res.body.files).toEqual([]);
      expect(res.body.validationJsonOutput).toBeUndefined();
      expect(res.body.publishInfo).toMatchObject({ version: 1, subVersion: 1 });
    });

    it('returns the design + changed resources when out of date', async () => {
      const res = await request(server())
        .post(`/survey/${SURVEY_OFF}/offline/design`)
        .set('Authorization', SUPER)
        .send({ version: 0, subVersion: 0, lastModified: '2024-01-01 00:00:00' })
        .expect(201);
      expect(res.body.files).toEqual([
        { name: 'logo.png', size: 10, lastModified: '2024-06-01 00:00:00' },
      ]);
      expect(res.body.validationJsonOutput).toBeDefined();
      expect(res.body.publishInfo).toMatchObject({ version: 1, subVersion: 1 });
    });

    it('500 when the survey has no published version', () =>
      request(server())
        .post(`/survey/${SURVEY}/offline/design`)
        .set('Authorization', SUPER)
        .send({ version: 1, subVersion: 1, lastModified: '2024-01-01 00:00:00' })
        .expect(500));

    it('400 when the survey is closed', () =>
      request(server())
        .post(`/survey/${SURVEY_CLOSED}/offline/design`)
        .set('Authorization', SUPER)
        .send({ version: 1, subVersion: 1, lastModified: '2024-01-01 00:00:00' })
        .expect(400));
  });
});
