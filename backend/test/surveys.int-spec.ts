import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { bearer, startTestApp, TestApp } from './harness';

const S_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const S_B = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const S_MISSING = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

/**
 * Single-org read access for GET /survey/:surveyId: the route carries no role
 * gate, so any authenticated user can read any survey; missing → 404,
 * unauthenticated → 401.
 */
describe('GET /survey/:surveyId (single-org access)', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await startTestApp();
    app = ctx.app;
    root = ctx.root;
    await root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, record_gps, save_ip, save_timings, background_audio)
       VALUES
         ($1,false,'Alpha',0,false,false,false,false),
         ($2,false,'Beta',0,false,false,false,false)`,
      [S_A, S_B],
    );
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const getSurvey = (surveyId: string, tok: string) =>
    request(app.getHttpServer())
      .get(`/survey/${surveyId}`)
      .set('Authorization', tok);

  it('super_admin can read any survey', () =>
    getSurvey(S_A, bearer({ authorities: ['super_admin'] })).expect(200));

  it('any authenticated user (surveyor) can read any survey', () =>
    getSurvey(S_B, bearer({ authorities: ['surveyor'] }))
      .expect(200)
      .expect((r) => expect(r.body.name).toBe('Beta')));

  it('gets 404 for a non-existent survey', () =>
    getSurvey(S_MISSING, bearer({ authorities: ['super_admin'] })).expect(404));

  it('requires authentication (401)', () =>
    request(app.getHttpServer()).get(`/survey/${S_A}`).expect(401));
});
