import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EngineService } from '../src/engine/engine.service';
import { runValidate } from '../src/engine/engine-runtime';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { bearer, startTestApp, TestApp } from './harness';

const SURVEY_ACTIVE = '10000000-0000-0000-0000-000000000001';
const SURVEY_DRAFT = '10000000-0000-0000-0000-000000000002';

const SUPER = bearer({ authorities: ['super_admin'] });

const engine = new EngineService();
const DESIGN = runValidate(engine.newSurvey('Runnable'));
const DESIGN_JSON = JSON.stringify(DESIGN);
const EXPECTED_RUNTIME = `${engine.commonScript()}\n\n${DESIGN.script}`;

const files = { getText: jest.fn().mockResolvedValue(DESIGN_JSON) };

describe('Survey run — runtime.js', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  const addSurvey = (id: string, status: string, published: boolean) =>
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
           VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,$2)`,
          [id, published],
        ),
      );

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(files),
    });
    app = ctx.app;
    root = ctx.root;

    await addSurvey(SURVEY_ACTIVE, 'ACTIVE', true);
    await addSurvey(SURVEY_DRAFT, 'DRAFT', false);
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const server = () => app.getHttpServer();

  it('serves the runtime bundle for an active survey (public, no auth)', async () => {
    const res = await request(server())
      .get(`/survey/${SURVEY_ACTIVE}/run/runtime.js`)
      .expect(200);
    expect(res.headers['content-type']).toContain('application/javascript');
    expect(res.text).toBe(EXPECTED_RUNTIME);
  });

  it('400 running a survey with no published version', () =>
    request(server()).get(`/survey/${SURVEY_DRAFT}/run/runtime.js`).expect(400));

  it('serves the preview runtime for an admin (working version)', async () => {
    const res = await request(server())
      .get(`/survey/${SURVEY_DRAFT}/preview/runtime.js`)
      .set('Authorization', SUPER)
      .expect(200);
    expect(res.text).toBe(EXPECTED_RUNTIME);
  });

  it('401 for an unauthenticated preview', () =>
    request(server()).get(`/survey/${SURVEY_DRAFT}/preview/runtime.js`).expect(401));
});
