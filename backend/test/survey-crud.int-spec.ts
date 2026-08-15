import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { bearer, startTestApp, TestApp } from './harness';

const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const S_DRAFT = '10000000-0000-0000-0000-000000000001';
const S_ACTIVE = '10000000-0000-0000-0000-000000000002';
const S_CLOSED = '10000000-0000-0000-0000-000000000003';
const S_DATED = '10000000-0000-0000-0000-000000000004';

const BEARER = bearer({ userId: ADMIN });

/**
 * The survey metadata slice: read (DTO), edit, close, delete, and the dashboard
 * list/offline queries. Also pins down date-format parity — the API
 * emits bare "yyyy-MM-dd HH:mm:ss" wall clocks, which the timestamp transformer
 * must reproduce byte-for-byte regardless of the process timezone.
 */
describe('Survey metadata endpoints', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  async function insertSurvey(
    id: string,
    name: string,
    status: string,
    usage: string,
    creationDate: string | null,
  ): Promise<void> {
    await root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
          record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,true,$2,-1,$3,$4,$5,$5,true,true,true,true)`,
      [id, name, status, usage, creationDate],
    );
    await root.query(
      `INSERT INTO versions
         (version, sub_version, survey_id, last_modified, schema, valid, published)
       VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,$2)`,
      [id, status === 'ACTIVE'],
    );
  }

  beforeAll(async () => {
    ctx = await startTestApp();
    app = ctx.app;
    root = ctx.root;

    await insertSurvey(S_DRAFT, 'Draft', 'DRAFT', 'MIXED', null);
    await insertSurvey(S_ACTIVE, 'Active', 'ACTIVE', 'MIXED', null);
    await insertSurvey(S_CLOSED, 'Closed', 'CLOSED', 'WEB', null);
    await insertSurvey(S_DATED, 'Dated', 'DRAFT', 'WEB', '2024-01-15 10:30:00');
    // A completed, non-preview response so the dashboard counts are exercised.
    await root.query(
      `INSERT INTO responses
         (id, version, survey_id, preview, nav_index, start_date, submit_date, lang, events)
       VALUES ($1,1,$2,false,'{}','2024-02-01 09:00:00','2024-02-01 09:05:00','en','[]')`,
      ['20000000-0000-0000-0000-000000000001', S_ACTIVE],
    );
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const get = (path: string) =>
    request(app.getHttpServer()).get(path).set('Authorization', BEARER);
  const put = (path: string) =>
    request(app.getHttpServer()).put(path).set('Authorization', BEARER);
  const del = (path: string) =>
    request(app.getHttpServer()).delete(path).set('Authorization', BEARER);

  describe('GET /survey/:id', () => {
    it('emits enums lowercased and dates as "yyyy-MM-dd HH:mm:ss"', async () => {
      const res = await get(`/survey/${S_DATED}`).expect(200);
      expect(res.body.status).toBe('draft');
      expect(res.body.usage).toBe('web');
      // The exact wall clock stored — proves the transformer is TZ-independent.
      expect(res.body.creationDate).toBe('2024-01-15 10:30:00');
      expect(res.body.surveyNavigationData.navigationMode).toBe('GROUP_BY_GROUP');
    });
  });

  describe('PUT /survey/:id (edit)', () => {
    it('merges fields and bumps lastModified', async () => {
      const res = await put(`/survey/${S_DRAFT}`)
        .send({ name: 'Renamed', quota: 42, navigationMode: 'ALL_IN_ONE' })
        .expect(200);
      expect(res.body.name).toBe('Renamed');
      expect(res.body.quota).toBe(42);
      expect(res.body.surveyNavigationData.navigationMode).toBe('ALL_IN_ONE');
      expect(res.body.lastModified).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('rejects an over-long name (400)', () =>
      put(`/survey/${S_DRAFT}`)
        .send({ name: 'x'.repeat(51) })
        .expect(400)
        .expect((r) => expect(r.body.error).toBe('InvalidSurveyName')));

    // Optional dates: explicit null (how the frontend clears a date) passes the
    // boundary check and stores NULL — it must not be mistaken for malformed.
    it('accepts explicit null start/end dates (clears them)', () =>
      put(`/survey/${S_DRAFT}`)
        .send({ startDate: null, endDate: null })
        .expect(200)
        .expect((r) => {
          expect(r.body.startDate).toBeNull();
          expect(r.body.endDate).toBeNull();
        }));

    it('rejects start date after end date (400)', () =>
      put(`/survey/${S_DRAFT}`)
        .send({ startDate: '2025-06-01 00:00:00', endDate: '2025-01-01 00:00:00' })
        .expect(400)
        .expect((r) => expect(r.body.error).toBe('InvalidSurveyDates')));

    // Boundary validation: a malformed date is a 400, not
    // a 500 from a bad `timestamp` literal reaching Postgres.
    it('rejects a malformed date (400, not 500)', () =>
      put(`/survey/${S_DRAFT}`)
        .send({ startDate: 'tomorrow' })
        .expect(400));

    // A mixed ISO/space pairing that a raw string compare would mis-order into a
    // false "start after end" — rejected outright instead (finding #56 B).
    it('rejects a non-canonical ISO date (400)', () =>
      put(`/survey/${S_DRAFT}`)
        .send({
          startDate: '2025-06-02T09:00:00.000Z',
          endDate: '2025-06-02 17:00:00',
        })
        .expect(400));

    it('refuses to edit a closed survey (400)', () =>
      put(`/survey/${S_CLOSED}`)
        .send({ name: 'nope' })
        .expect(400)
        .expect((r) => expect(r.body.error).toBe('SurveyIsClosedException')));
  });

  describe('PUT /survey/:id/close', () => {
    it('closes an active survey', () =>
      put(`/survey/${S_ACTIVE}/close`)
        .expect(200)
        .expect((r) => expect(r.body.status).toBe('closed')));

    it('refuses to close a non-active survey (400)', () =>
      put(`/survey/${S_DATED}/close`)
        .expect(400)
        .expect((r) => expect(r.body.error).toBe('SurveyIsNotActiveException')));
  });

  describe('GET /survey/all (dashboard)', () => {
    it('returns a paginated envelope with versions and counts', async () => {
      const res = await get('/survey/all?per_page=50').expect(200);
      expect(res.body.pageNumber).toBe(0);
      expect(res.body.totalCount).toBeGreaterThanOrEqual(4);
      const active = res.body.surveys.find((s: { id: string }) => s.id === S_ACTIVE);
      expect(active).toBeDefined();
      expect(active.latestVersion.version).toBe(1);
      expect(active.responsesCount).toBe(1);
      expect(active.completeResponseCount).toBe(1);
    });
  });

  describe('GET /survey/offline', () => {
    it('returns only active OFFLINE/MIXED surveys', async () => {
      const res = await get('/survey/offline').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const s of res.body) {
        expect(s.status).toBe('active');
        expect(['offline', 'mixed']).toContain(s.usage);
      }
    });
  });

  describe('DELETE /survey/:id', () => {
    it('deletes a non-active survey', async () => {
      await del(`/survey/${S_DATED}`).expect(204);
      const rows = await root.query(`SELECT 1 FROM surveys WHERE id = $1`, [
        S_DATED,
      ]);
      expect(rows.length).toBe(0);
    });

    it('deletes a draft survey', async () => {
      await del(`/survey/${S_DRAFT}`).expect(204);
      const rows = await root.query(`SELECT 1 FROM surveys WHERE id = $1`, [
        S_DRAFT,
      ]);
      expect(rows.length).toBe(0);
    });
  });
});
