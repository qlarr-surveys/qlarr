import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { bearer, startTestApp, TestApp } from './harness';

const S_OPEN = '10000000-0000-0000-0000-000000000001';
const S_CLOSED = '10000000-0000-0000-0000-000000000002';
const S_MISSING = '10000000-0000-0000-0000-0000000000ff';

const token = (roles: string[]) => bearer({ authorities: roles });
const SUPER = token(['super_admin']);
const SURVEYOR = token(['surveyor']);

// Stub storage — the upload returns whatever filename it's handed (the uuid),
// so we can follow it into the DB row and back out through getValues.
const fileHelper = {
  // Returns the filename it's handed (the uuid) so we can follow it into the DB.
  upload: jest.fn((...args: unknown[]) => Promise.resolve(args[4] as string)),
  delete: jest.fn().mockResolvedValue(undefined),
};

const attach = (server: unknown, url: string, body: unknown) =>
  request(server as never)
    .post(url)
    .set('Authorization', SUPER)
    .attach('file', Buffer.from(JSON.stringify(body)), 'ac.json');

describe('Autocomplete admin endpoints', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  const insertSurvey = (id: string, status: string) =>
    root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
          record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,true,$2,-1,$3,'MIXED','2024-01-01 00:00:00','2024-01-01 00:00:00',
               true,true,true,true)`,
      [id, `s-${status}`, status],
    );

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(fileHelper),
    });
    app = ctx.app;
    root = ctx.root;

    await insertSurvey(S_OPEN, 'DRAFT');
    await insertSurvey(S_CLOSED, 'CLOSED');
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  beforeEach(() => jest.clearAllMocks());
  const server = () => app.getHttpServer();

  describe('POST /autocomplete/:surveyId/:componentId', () => {
    it('stores the values and returns file info + row count', async () => {
      const res = await attach(
        server(),
        `/autocomplete/${S_OPEN}/Q1`,
        ['apple', 'apricot', 'banana'],
      ).expect(201);

      expect(res.body).toMatchObject({ rowCount: 3, name: expect.any(String) });
      expect(res.body.lastModified).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      // Stored under the survey's resources folder.
      const [sid, folder] = fileHelper.upload.mock.calls[0];
      expect(sid).toBe(S_OPEN);
      expect((folder as { isResources: boolean }).isResources).toBe(true);

      // Readable back through getValues.
      const get = await request(server())
        .get(`/autocomplete/${S_OPEN}/Q1`)
        .set('Authorization', SUPER)
        .expect(200);
      expect(get.body).toEqual(['apple', 'apricot', 'banana']);
    });

    it('replaces an existing file for the same component (upsert + old file deleted)', async () => {
      const first = await attach(
        server(),
        `/autocomplete/${S_OPEN}/Q2`,
        ['old'],
      ).expect(201);

      await attach(
        server(),
        `/autocomplete/${S_OPEN}/Q2`,
        ['new1', 'new2'],
      ).expect(201);

      // The previous stored file was cleaned up.
      expect(fileHelper.delete).toHaveBeenCalledWith(
        S_OPEN,
        expect.objectContaining({ isResources: true }),
        first.body.name,
      );
      const get = await request(server())
        .get(`/autocomplete/${S_OPEN}/Q2`)
        .set('Authorization', SUPER)
        .expect(200);
      expect(get.body).toEqual(['new1', 'new2']);
      // Still a single row for the component (unique on survey_id + component_id).
      const [{ count }] = await root.query(
        `SELECT COUNT(*) AS count FROM auto_complete WHERE survey_id = $1 AND component_id = 'Q2'`,
        [S_OPEN],
      );
      expect(Number(count)).toBe(1);
    });

    it('400 for a malformed file (not an array / empty / non-string element)', async () => {
      await attach(server(), `/autocomplete/${S_OPEN}/Qx`, {
        not: 'an array',
      }).expect(400);
      await attach(server(), `/autocomplete/${S_OPEN}/Qx`, []).expect(400);
      const res = await attach(
        server(),
        `/autocomplete/${S_OPEN}/Qx`,
        ['ok', 5],
      ).expect(400);
      expect(res.body.error).toBe('AutoCompleteMalformedInputException');
    });

    it('400 when the survey is closed', () =>
      attach(server(), `/autocomplete/${S_CLOSED}/Q1`, ['a']).expect(400));

    it('404 when the survey is missing', () =>
      attach(server(), `/autocomplete/${S_MISSING}/Q1`, ['a']).expect(404));

    it('403 for a surveyor role', () =>
      request(server())
        .post(`/autocomplete/${S_OPEN}/Q1`)
        .set('Authorization', SURVEYOR)
        .attach('file', Buffer.from('["a"]'), 'ac.json')
        .expect(403));

    it('401 unauthenticated', () =>
      request(server())
        .post(`/autocomplete/${S_OPEN}/Q1`)
        .attach('file', Buffer.from('["a"]'), 'ac.json')
        .expect(401));
  });

  describe('GET /autocomplete/:surveyId/:componentId', () => {
    it('returns [] for a component with no uploaded file', async () => {
      const res = await request(server())
        .get(`/autocomplete/${S_OPEN}/NoSuchComponent`)
        .set('Authorization', SUPER)
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('404 for a missing survey', () =>
      request(server())
        .get(`/autocomplete/${S_MISSING}/Q1`)
        .set('Authorization', SUPER)
        .expect(404));

    it('403 for a surveyor role', () =>
      request(server())
        .get(`/autocomplete/${S_OPEN}/Q1`)
        .set('Authorization', SURVEYOR)
        .expect(403));

    it('401 unauthenticated', () =>
      request(server()).get(`/autocomplete/${S_OPEN}/Q1`).expect(401));
  });
});
