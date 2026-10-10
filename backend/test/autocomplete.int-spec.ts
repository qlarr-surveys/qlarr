import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { startTestApp, TestApp } from './harness';

const SURVEY = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const UNKNOWN = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

/**
 * The public (no JWT) autocomplete lookup: resolves values for a survey's
 * uploaded value list, filtered by the query.
 */
describe('GET /survey/:surveyId/autocomplete/:filename (public)', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await startTestApp();
    app = ctx.app;
    root = ctx.root;

    // The survey row (auto_complete has an FK to surveys).
    await root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,false,'S',0,false,false,false,false)`,
      [SURVEY],
    );
    // An autocomplete file (JSONB array) for that survey.
    await root.query(
      `INSERT INTO auto_complete (survey_id, component_id, filename, data)
       VALUES ($1,'Q1','fruits',$2::jsonb)`,
      [SURVEY, JSON.stringify(['apple', 'apricot', 'banana', 'grape', 'orange'])],
    );
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  it('returns matching values (no auth)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/survey/${SURVEY}/autocomplete/fruits?q=an`)
      .expect(200);
    // 'banana' and 'orange' contain "an", ordered.
    expect(res.body).toEqual(['banana', 'orange']);
  });

  it('honours the limit', async () => {
    const res = await request(app.getHttpServer())
      .get(`/survey/${SURVEY}/autocomplete/fruits?q=&limit=1`)
      .expect(200);
    expect(res.body).toEqual(['apple']);
  });

  it('returns [] for an unknown survey/file', async () => {
    await request(app.getHttpServer())
      .get(`/survey/${UNKNOWN}/autocomplete/fruits?q=a`)
      .expect(200)
      .expect((r) => expect(r.body).toEqual([]));
  });
});
