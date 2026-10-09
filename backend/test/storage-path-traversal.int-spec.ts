import { INestApplication } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { bearer, startTestApp, TestApp } from './harness';

/**
 * Path traversal through the file routes, end to end against the REAL local
 * storage (no FILE_HELPER mock), so the assertions are about bytes on disk.
 * Express URL-decodes route params: `..%2F..%2F..%2F<other>%2Fdesign%2F1`
 * reaches the handler as `../../../<other>/design/1`. Before the fix the only
 * check was "stays under the storage root" — which every survey shares — so a
 * SURVEYOR could overwrite another survey's design and anyone could download it.
 */
const SURVEY = '10000000-0000-0000-0000-000000000001';
const OTHER = '10000000-0000-0000-0000-000000000002';
const RESPONSE = '20000000-0000-0000-0000-000000000001';
// A response whose stored file descriptor was tampered with: the traversal
// comes from data, not the URL, so only the storage helper's guard can stop it.
const R_TAMPERED = '20000000-0000-0000-0000-000000000002';

const OTHER_DESIGN = 'OTHER-SURVEY-DESIGN-SECRET';
const OWN_DESIGN = 'OWN-SURVEY-DESIGN-SECRET';

const SURVEYOR = bearer({ authorities: ['surveyor'] });
const SUPER = bearer({ authorities: ['super_admin'] });

/** Percent-encode into a single path segment (`/` → `%2F`). */
const enc = (s: string) => encodeURIComponent(s);
// From `{root}/{SURVEY}/responses/{RESPONSE}/` up to `{root}/{OTHER}/design/1`.
const TO_OTHER_DESIGN = enc(`../../../${OTHER}/design/1`);
// As a responseId: `{root}/{SURVEY}/responses/{this}/1` → `{root}/{OTHER}/design/1`.
const RESPONSE_TO_OTHER_DESIGN = enc(`../../${OTHER}/design`);

/** Collect the raw response bytes (for binary assertions). */
const binaryParser = (res: any, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('Storage path traversal (real local storage)', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;
  let otherDesign: string;
  let ownDesign: string;

  const addSurvey = (id: string) =>
    root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
          record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,true,$2,-1,'ACTIVE','MIXED','2024-01-01 00:00:00','2024-01-01 00:00:00',
               true,true,true,true)`,
      [id, `name-${id}`],
    );

  beforeAll(async () => {
    ctx = await startTestApp();
    app = ctx.app;
    root = ctx.root;

    await addSurvey(SURVEY);
    await addSurvey(OTHER);
    await root.query(
      `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
       VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,true)`,
      [SURVEY],
    );
    await root.query(
      `INSERT INTO responses
         (id, version, survey_id, preview, surveyor, nav_index, start_date, submit_date, lang, events, "values")
       VALUES ($1,1,$2,false,NULL,'','2024-01-01 00:00:00','2024-02-01 00:00:00','en','[]'::jsonb,$3::jsonb)`,
      [
        R_TAMPERED,
        SURVEY,
        JSON.stringify({
          'q1.value': {
            filename: 'photo.png',
            stored_filename: `../../../${OTHER}/design/1`,
            size: 10,
            type: 'image/png',
          },
        }),
      ],
    );

    mkdirSync(join(ctx.storageRoot, OTHER, 'design'), { recursive: true });
    otherDesign = join(ctx.storageRoot, OTHER, 'design', '1');
    mkdirSync(join(ctx.storageRoot, SURVEY, 'design'), { recursive: true });
    ownDesign = join(ctx.storageRoot, SURVEY, 'design', '1');
  }, 180_000);

  // The files every traversal below aims at — rewritten per test so one
  // successful attack can't mask (or cause) another test's result.
  beforeEach(() => {
    writeFileSync(otherDesign, OTHER_DESIGN);
    writeFileSync(ownDesign, OWN_DESIGN);
  });

  afterAll(async () => {
    await ctx?.close();
  });

  const server = () => app.getHttpServer();
  const offlineUpload = (responseId: string, fileName: string) =>
    request(server())
      .post(`/survey/${SURVEY}/offline/response/${responseId}/upload/${fileName}`)
      .set('Authorization', SURVEYOR)
      .attach('file', Buffer.from('ATTACKER-BYTES'), 'x.jpg');

  const expectOtherDesignIntact = () =>
    expect(readFileSync(otherDesign, 'utf-8')).toBe(OTHER_DESIGN);

  describe('write: offline response file upload', () => {
    it('400s an encoded traversal in the fileName and leaves the other survey design untouched', async () => {
      const res = await offlineUpload(RESPONSE, TO_OTHER_DESIGN).expect(400);
      expect(res.body.error).toBe('InvalidFilePathException');
      expectOtherDesignIntact();
    });

    it('400s an encoded traversal in the responseId and leaves the other survey design untouched', async () => {
      await offlineUpload(RESPONSE_TO_OTHER_DESIGN, '1').expect(400);
      expectOtherDesignIntact();
    });

    it('400s a backslash or NUL in the fileName', async () => {
      await offlineUpload(RESPONSE, enc('..\\..\\x')).expect(400);
      await offlineUpload(RESPONSE, enc('a\0b')).expect(400);
    });

    it('400s a traversal through the exists probe instead of answering', async () => {
      const res = await request(server())
        .post(`/survey/${SURVEY}/offline/response/${RESPONSE}/upload/${TO_OTHER_DESIGN}/exists`)
        .set('Authorization', SURVEYOR)
        .expect(400);
      expect(res.body.error).toBe('InvalidFilePathException');
    });

    it('400s a resource delete that traverses to another survey, which keeps its file', async () => {
      await request(server())
        .delete(`/survey/${SURVEY}/resource/${enc(`../../${OTHER}/design/1`)}`)
        .set('Authorization', SUPER)
        .expect(400);
      expect(existsSync(otherDesign)).toBe(true);
      expectOtherDesignIntact();
    });
  });

  describe('read: public downloads', () => {
    it('400s an encoded traversal in the attach filename without leaking the file', async () => {
      const res = await request(server())
        .get(`/survey/${SURVEY}/response/${RESPONSE}/attach/${TO_OTHER_DESIGN}`)
        .expect(400);
      expect(res.body.error).toBe('InvalidFilePathException');
      expect(res.text).not.toContain(OTHER_DESIGN);
    });

    it('400s an encoded traversal in the attach responseId without leaking the file', async () => {
      const res = await request(server())
        .get(`/survey/${SURVEY}/response/${RESPONSE_TO_OTHER_DESIGN}/attach/1`)
        .expect(400);
      expect(res.text).not.toContain(OTHER_DESIGN);
    });

    it('400s a resource name that climbs into the design folder or another survey', async () => {
      const own = await request(server())
        .get(`/survey/${SURVEY}/resource/${enc('../design/1')}`)
        .expect(400);
      expect(own.text).not.toContain(OWN_DESIGN);
      const other = await request(server())
        .get(`/survey/${SURVEY}/resource/${enc(`../../${OTHER}/design/1`)}`)
        .expect(400);
      expect(other.text).not.toContain(OTHER_DESIGN);
    });

    it('400s a stored_filename tampered into a traversal (the storage-level guard)', async () => {
      const res = await request(server())
        .get(`/survey/${SURVEY}/response/attach/${R_TAMPERED}/q1`)
        .expect(400);
      expect(res.body.error).toBe('InvalidFilePathException');
      expect(res.text).not.toContain(OTHER_DESIGN);
    });
  });

  describe('legit names still work end to end', () => {
    it('uploads, probes and downloads an offline file under responses/{id}/', async () => {
      const bytes = Buffer.from('REAL-PHOTO');
      await request(server())
        .post(`/survey/${SURVEY}/offline/response/${RESPONSE}/upload/myfile.jpg`)
        .set('Authorization', SURVEYOR)
        .attach('file', bytes, 'myfile.jpg')
        .expect(201)
        .expect((r) => expect(r.body.stored_filename).toBe('myfile.jpg'));
      expect(
        readFileSync(join(ctx.storageRoot, SURVEY, 'responses', RESPONSE, 'myfile.jpg')),
      ).toEqual(bytes);

      await request(server())
        .post(`/survey/${SURVEY}/offline/response/${RESPONSE}/upload/myfile.jpg/exists`)
        .set('Authorization', SURVEYOR)
        .expect(201)
        .expect((r) => expect(r.body).toBe(true));

      const res = await request(server())
        .get(`/survey/${SURVEY}/response/${RESPONSE}/attach/myfile.jpg`)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      expect(res.body).toEqual(bytes);
    });
  });
});
