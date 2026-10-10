import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bearer, startTestApp, TestApp } from './harness';

const BEARER = bearer({ authorities: ['super_admin'] });

/**
 * POST /survey/import over HTTP, fed the ZIP that GET /survey/:id/export
 * produced — real storage, real multer wiring. Pins that the import route's own
 * upload limits (`uploadLimits(MAX_UPLOAD_BYTES)`, one `file` part) still let a
 * genuine export through; the archive parsing itself is covered by
 * survey-import.unit-spec and zip-import-limits.int-spec.
 */
describe('Survey export → import round trip', () => {
  let ctx: TestApp;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await startTestApp();
    app = ctx.app;
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const server = () => app.getHttpServer();

  it('re-imports an exported survey ZIP as a new draft', async () => {
    const created = await request(server())
      .post('/survey/create')
      .set('Authorization', BEARER)
      .send({ name: 'Round Trip' })
      .expect(200);

    const exported = await request(server())
      .get(`/survey/${created.body.id}/export`)
      .set('Authorization', BEARER)
      .responseType('blob')
      .expect(200);
    expect(exported.headers['content-type']).toContain('application/zip');
    expect(Buffer.isBuffer(exported.body)).toBe(true);

    const imported = await request(server())
      .post('/survey/import')
      .set('Authorization', BEARER)
      .attach('file', exported.body as Buffer, 'survey.zip')
      .expect(200);

    // A new draft whose name came from the exported survey.json (de-duplicated
    // against the original).
    expect(imported.body.id).not.toBe(created.body.id);
    expect(imported.body).toMatchObject({ name: 'Round Trip(1)', status: 'draft' });
  });
});
