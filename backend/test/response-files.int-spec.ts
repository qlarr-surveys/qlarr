import { INestApplication } from '@nestjs/common';
import { Readable } from 'node:stream';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { bearer, startTestApp, TestApp } from './harness';

const SURVEY = '10000000-0000-0000-0000-000000000001';
const SURVEY_BIG = '10000000-0000-0000-0000-000000000002';
const SURVEY_INACTIVE = '10000000-0000-0000-0000-000000000003';
// ACTIVE status but past its end date — offline sync must still accept files.
const SURVEY_ENDED = '10000000-0000-0000-0000-000000000004';
const R_FILE = '20000000-0000-0000-0000-000000000001';
const R_BIG = '20000000-0000-0000-0000-000000000002';
const R_PREVIEW = '20000000-0000-0000-0000-000000000003';
const R_ENDED = '20000000-0000-0000-0000-000000000004';

const SUPER = bearer({ authorities: ['super_admin'] });

/** Collect the raw response bytes (for binary/zip assertions). */
const binaryParser = (res: any, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

const files = {
  upload: jest.fn().mockResolvedValue('stored-x'),
  doesFileExist: jest.fn().mockResolvedValue(true),
  responseFiles: jest.fn().mockResolvedValue([]),
  delete: jest.fn().mockResolvedValue(undefined),
  download: jest.fn(),
};

describe('Response file ops + bulk download', () => {
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
        [id, `name-${id}`, status],
      )
      .then(() =>
        root.query(
          `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
           VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,true)`,
          [id],
        ),
      );

  const addResponse = (
    id: string,
    surveyId: string,
    values: string,
    preview = false,
  ) =>
    root.query(
      `INSERT INTO responses
         (id, version, survey_id, preview, surveyor, nav_index, start_date, submit_date, lang, events, "values")
       VALUES ($1,1,$2,$4,NULL,'','2024-01-01 00:00:00','2024-02-01 00:00:00','en','[]'::jsonb,$3::jsonb)`,
      [id, surveyId, values, preview],
    );

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(files),
    });
    app = ctx.app;
    root = ctx.root;

    await addSurvey(SURVEY, 'ACTIVE');
    await addSurvey(SURVEY_BIG, 'ACTIVE');
    await addSurvey(SURVEY_INACTIVE, 'DRAFT');
    // ACTIVE but ended two days ago: online uploads must 400 (window check),
    // offline sync must still succeed (status-only check).
    await root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
          end_date, record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,true,'ended',-1,'ACTIVE','MIXED','2024-01-01 00:00:00','2024-01-01 00:00:00',
               (now() AT TIME ZONE 'utc') - interval '2 days',
               true,true,true,true)`,
      [SURVEY_ENDED],
    );
    await root.query(
      `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
       VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,true)`,
      [SURVEY_ENDED],
    );

    await addResponse(
      R_FILE,
      SURVEY,
      '{"q1.value":{"filename":"photo.png","stored_filename":"stored-1","size":100,"type":"image/png"}}',
    );
    await addResponse(
      R_BIG,
      SURVEY_BIG,
      '{"q1.value":{"filename":"huge.mp4","stored_filename":"stored-2","size":314572800,"type":"video/mp4"}}',
    );
    // A PREVIEW response on SURVEY carrying a 300MB file: must be excluded from
    // both the bulk ZIP (data leak) and the 200MB cap (a preview must not 413 a
    // legitimate export). Its index interleaves with real responses.
    await addResponse(
      R_PREVIEW,
      SURVEY,
      '{"q1.value":{"filename":"internal-test.pdf","stored_filename":"stored-preview","size":314572800,"type":"application/pdf"}}',
      true,
    );
    await addResponse(R_ENDED, SURVEY_ENDED, '{}');
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    files.upload.mockResolvedValue('stored-x');
    files.doesFileExist.mockResolvedValue(true);
    files.download.mockImplementation(() =>
      Promise.resolve({
        contentType: 'image/png',
        eTag: '"e1"',
        contentLength: 3,
        body: Readable.from(Buffer.from('img')),
      }),
    );
  });

  const server = () => app.getHttpServer();

  describe('bulk file download (ZIP)', () => {
    it('streams a zip of response files in range', async () => {
      const res = await request(server())
        .get(`/survey/${SURVEY}/response/files/download/0/999999`)
        .set('Authorization', SUPER)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      expect(res.headers['content-type']).toContain('application/zip');
      expect(res.headers['content-disposition']).toContain('responses-files.zip');
      expect(res.body.subarray(0, 2).toString('ascii')).toBe('PK'); // zip magic
      expect(files.download).toHaveBeenCalledWith(
        SURVEY,
        expect.objectContaining({ path: 'responses/' + R_FILE }),
        'stored-1',
      );
    });

    it('returns 204 when the range has no files', () =>
      request(server())
        .get(`/survey/${SURVEY}/response/files/download/500000/500001`)
        .set('Authorization', SUPER)
        .expect(204));

    it('rejects an export over the 200MB cap with 413', () =>
      request(server())
        .get(`/survey/${SURVEY_BIG}/response/files/download/0/999999`)
        .set('Authorization', SUPER)
        .expect(413));

    it('excludes PREVIEW responses from the ZIP and the 200MB cap', async () => {
      // SURVEY has a real 100-byte file (R_FILE) and a 300MB preview file
      // (R_PREVIEW). If previews leaked in, the cap would 413; they don't, so
      // this succeeds and only the real file is fetched.
      await request(server())
        .get(`/survey/${SURVEY}/response/files/download/0/999999`)
        .set('Authorization', SUPER)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      expect(files.download).toHaveBeenCalledWith(
        SURVEY,
        expect.objectContaining({ path: 'responses/' + R_FILE }),
        'stored-1',
      );
      expect(files.download).not.toHaveBeenCalledWith(
        SURVEY,
        expect.objectContaining({ path: 'responses/' + R_PREVIEW }),
        'stored-preview',
      );
    });

    it('survives an S3 body that errors mid-stream (no process crash)', async () => {
      // Body emits one chunk then errors — simulating a socket reset / read
      // timeout part-way through the transfer. The request must still complete
      // (the entry is truncated, the response is not fatal).
      files.download.mockImplementationOnce(() => {
        const body = new Readable({
          read() {
            this.push(Buffer.from('partial'));
            process.nextTick(() =>
              this.emit('error', new Error('socket hang up')),
            );
          },
        });
        return Promise.resolve({
          contentType: 'image/png',
          eTag: '"e1"',
          contentLength: 100,
          body,
        });
      });
      const res = await request(server())
        .get(`/survey/${SURVEY}/response/files/download/0/999999`)
        .set('Authorization', SUPER)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      expect(res.headers['content-type']).toContain('application/zip');
      expect(res.body.subarray(0, 2).toString('ascii')).toBe('PK'); // zip magic
    });
  });

  describe('attach upload (public) + download', () => {
    it('stores an uploaded file under the response values', async () => {
      const res = await request(server())
        .post(`/survey/${SURVEY}/response/attach/${R_FILE}/q2`)
        .attach('file', Buffer.from('bytes'), 'doc.pdf')
        .expect(201);
      // stored_filename is a freshly generated UUID (the
      // FileHelper's return value is ignored).
      expect(res.body.filename).toBe('doc.pdf');
      expect(res.body.size).toBe(5);
      expect(res.body.stored_filename).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      const [row] = await root.query(
        `SELECT "values" -> 'q2.value' AS v FROM responses WHERE id = $1`,
        [R_FILE],
      );
      expect(row.v).toMatchObject({
        filename: 'doc.pdf',
        stored_filename: res.body.stored_filename,
      });
    });

    it('rejects an oversized image with 413', () => {
      const big = Buffer.alloc(11 * 1024 * 1024); // >10MB image cap
      return request(server())
        .post(`/survey/${SURVEY}/response/attach/${R_FILE}/q3`)
        .attach('file', big, 'big.png')
        .expect(413);
    });

    it('rejects an attach upload to a non-active survey with 400', () =>
      request(server())
        .post(`/survey/${SURVEY_INACTIVE}/response/attach/${R_FILE}/q1`)
        .attach('file', Buffer.from('x'), 'a.png')
        .expect(400));

    it('downloads a question file with an inline filename', async () => {
      const res = await request(server())
        .get(`/survey/${SURVEY}/response/attach/${R_FILE}/q1`)
        .expect(200);
      expect(res.headers['content-type']).toContain('image/png');
      expect(res.headers['content-disposition']).toContain('q1-photo.png');
    });

    it('404-equivalent (400) for a question with no file', () =>
      request(server())
        .get(`/survey/${SURVEY}/response/attach/${R_FILE}/qX`)
        .expect(400));

    it('downloads a response file by stored name', () =>
      request(server())
        .get(`/survey/${SURVEY}/response/${R_FILE}/attach/stored-1`)
        .expect(200)
        .expect((r) => expect(r.headers['cache-control']).toBe('max-age=2592000')));
  });

  describe('preview attach upload (authenticated — designer only)', () => {
    const previewUrl = `/survey/${SURVEY}/response/preview/attach/${R_FILE}/q2`;

    // The regression: unlike the respondent attach routes, preview upload is
    // NOT public — an anonymous caller can't spam files into S3.
    it('rejects an unauthenticated preview upload (401)', () =>
      request(server())
        .post(previewUrl)
        .attach('file', Buffer.from('bytes'), 'p.pdf')
        .expect(401));

    it('accepts a preview upload from a permitted caller (201)', () =>
      request(server())
        .post(previewUrl)
        .set('Authorization', SUPER)
        .attach('file', Buffer.from('bytes'), 'p.pdf')
        .expect(201)
        .expect((r) => expect(r.body.filename).toBe('p.pdf')));

    it('404s a preview upload for a nonexistent survey (no orphan file)', async () => {
      const missing = '99999999-0000-0000-0000-000000000000';
      await request(server())
        .post(`/survey/${missing}/response/preview/attach/${R_FILE}/q2`)
        .set('Authorization', SUPER)
        .attach('file', Buffer.from('bytes'), 'p.pdf')
        .expect(404);
      expect(files.upload).not.toHaveBeenCalled();
    });
  });

  describe('offline file ops (authenticated)', () => {
    it('uploads an offline file under the chosen name', () =>
      request(server())
        .post(`/survey/${SURVEY}/offline/response/${R_FILE}/upload/myfile.jpg`)
        .set('Authorization', SUPER)
        .attach('file', Buffer.from('x'), 'myfile.jpg')
        .expect(201)
        .expect((r) => expect(r.body.stored_filename).toBe('myfile.jpg')));

    it('reports whether an offline file exists', () =>
      request(server())
        .post(`/survey/${SURVEY}/offline/response/${R_FILE}/upload/myfile.jpg/exists`)
        .set('Authorization', SUPER)
        .expect(201)
        .expect((r) => expect(r.body).toBe(true)));

    it('rejects an unauthenticated offline upload (401)', () =>
      request(server())
        .post(`/survey/${SURVEY}/offline/response/${R_FILE}/upload/f.jpg`)
        .attach('file', Buffer.from('x'), 'f.jpg')
        .expect(401));

    it('accepts an offline upload for an ACTIVE survey past its end date', () =>
      request(server())
        .post(`/survey/${SURVEY_ENDED}/offline/response/${R_ENDED}/upload/late.jpg`)
        .set('Authorization', SUPER)
        .attach('file', Buffer.from('x'), 'late.jpg')
        .expect(201)
        .expect((r) => expect(r.body.stored_filename).toBe('late.jpg')));

    it('still rejects an online attach upload past the end date (400)', () =>
      request(server())
        .post(`/survey/${SURVEY_ENDED}/response/attach/${R_ENDED}/q1`)
        .attach('file', Buffer.from('x'), 'late.jpg')
        .expect(400));
  });
});
