import { INestApplication } from '@nestjs/common';
import { Readable } from 'node:stream';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { bearer, startTestApp, TestApp } from './harness';

const S_OPEN = '10000000-0000-0000-0000-000000000001';
const S_CLOSED = '10000000-0000-0000-0000-000000000002';
const S_MISSING = '10000000-0000-0000-0000-0000000000ff';

const BEARER = bearer({ authorities: ['super_admin'] });

/** Stub storage: the endpoints/survey checks are under test, not the disk. */
const fileHelper = {
  upload: jest.fn().mockResolvedValue('stored-abc.png'),
  delete: jest.fn().mockResolvedValue(undefined),
  download: jest.fn().mockResolvedValue({
    contentType: 'image/png',
    eTag: '"etag-1"',
    contentLength: 3,
    body: Readable.from(Buffer.from('img')),
  }),
};

describe('Survey resource endpoints', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  const insertSurvey = (id: string, name: string, status: string) =>
    root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
          record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,true,$2,-1,$3,'MIXED','2024-01-01 00:00:00','2024-01-01 00:00:00',
               true,true,true,true)`,
      [id, name, status],
    );

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(fileHelper),
    });
    app = ctx.app;
    root = ctx.root;

    await insertSurvey(S_OPEN, 'open-survey', 'DRAFT');
    await insertSurvey(S_CLOSED, 'closed-survey', 'CLOSED');
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const server = () => app.getHttpServer();

  describe('POST /survey/:id/resource', () => {
    it('uploads to an open survey and returns FileInfo', async () => {
      const res = await request(server())
        .post(`/survey/${S_OPEN}/resource`)
        .set('Authorization', BEARER)
        .attach('file', Buffer.from('the-bytes'), 'logo.png')
        .expect(201);

      expect(res.body).toMatchObject({ name: 'stored-abc.png', size: 9 });
      expect(res.body.lastModified).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

      // Stored under the resources folder, with the original extension kept.
      expect(fileHelper.upload).toHaveBeenCalledTimes(1);
      const [sid, folder, buf, mime, filename] = fileHelper.upload.mock.calls[0];
      expect(sid).toBe(S_OPEN);
      expect(folder.isResources).toBe(true);
      expect(buf).toBeInstanceOf(Buffer);
      expect(mime).toBe('image/png');
      expect(filename).toMatch(/\.png$/);
    });

    it('rejects upload to a CLOSED survey with 400', () =>
      request(server())
        .post(`/survey/${S_CLOSED}/resource`)
        .set('Authorization', BEARER)
        .attach('file', Buffer.from('x'), 'a.png')
        .expect(400));

    it('rejects upload to an unknown survey with 404', () =>
      request(server())
        .post(`/survey/${S_MISSING}/resource`)
        .set('Authorization', BEARER)
        .attach('file', Buffer.from('x'), 'a.png')
        .expect(404));

    it('rejects an unauthenticated upload with 401', () =>
      request(server())
        .post(`/survey/${S_OPEN}/resource`)
        .attach('file', Buffer.from('x'), 'a.png')
        .expect(401));
  });

  describe('GET /survey/:id/resource/:file (public download)', () => {
    it('streams the file with content-type + cache headers, no auth', async () => {
      const res = await request(server())
        .get(`/survey/${S_OPEN}/resource/stored-abc.png`)
        .expect(200);

      expect(res.headers['content-type']).toContain('image/png');
      expect(res.headers['cache-control']).toBe('max-age=2592000');
      expect(res.headers['etag']).toBe('"etag-1"');
      expect(fileHelper.download).toHaveBeenCalledWith(
        S_OPEN,
        expect.objectContaining({ path: 'resources' }),
        'stored-abc.png',
      );
    });
  });

  describe('DELETE /survey/:id/resource/:file', () => {
    it('deletes a resource from an open survey', async () => {
      await request(server())
        .delete(`/survey/${S_OPEN}/resource/stored-abc.png`)
        .set('Authorization', BEARER)
        .expect(200);
      expect(fileHelper.delete).toHaveBeenCalledWith(
        S_OPEN,
        expect.objectContaining({ path: 'resources' }),
        'stored-abc.png',
      );
    });

    it('rejects delete on a CLOSED survey with 400', () =>
      request(server())
        .delete(`/survey/${S_CLOSED}/resource/x.png`)
        .set('Authorization', BEARER)
        .expect(400));

    it('rejects an unauthenticated delete with 401', () =>
      request(server())
        .delete(`/survey/${S_OPEN}/resource/x.png`)
        .expect(401));
  });
});
