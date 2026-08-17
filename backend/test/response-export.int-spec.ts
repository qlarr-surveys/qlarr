import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EngineService } from '../src/engine/engine.service';
import { runValidate } from '../src/engine/engine-runtime';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { bearer, startTestApp, TestApp } from './harness';

const SURVEY = '10000000-0000-0000-0000-000000000001';

const token = (roles: string[]) => bearer({ authorities: roles });
const SUPER = token(['super_admin']);
const SURVEYOR = token(['surveyor']);

const DESIGN_JSON = JSON.stringify(runValidate(new EngineService().newSurvey('Export')));
const files = { getText: jest.fn().mockResolvedValue(DESIGN_JSON) };

const binaryParser = (res: any, cb: (e: Error | null, b: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('Response export (CSV / XLSX)', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  const addResponse = (id: string, disqualified: boolean) =>
    root.query(
      `INSERT INTO responses
         (id, version, survey_id, preview, surveyor, nav_index, start_date, submit_date, lang, events, "values")
       VALUES ($1,1,$2,false,NULL,'','2024-01-01 00:00:00','2024-02-01 00:00:00','en','[]'::jsonb,$3::jsonb)`,
      [id, SURVEY, JSON.stringify({ 'Survey.disqualified': disqualified })],
    );

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(files),
    });
    app = ctx.app;
    root = ctx.root;

    await root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
          record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,true,'s',-1,'ACTIVE','MIXED','2024-01-01 00:00:00','2024-01-01 00:00:00',
               true,true,true,true)`,
      [SURVEY],
    );
    await root.query(
      `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
       VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,true)`,
      [SURVEY],
    );
    await addResponse('20000000-0000-0000-0000-000000000001', false);
    await addResponse('20000000-0000-0000-0000-000000000002', true);
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const server = () => app.getHttpServer();
  const base = `/survey/${SURVEY}/response/export`;

  it('exports CSV with the metadata header and a row per response', async () => {
    const res = await request(server())
      .get(`${base}/csv/0/999999`)
      .set('Authorization', SUPER)
      .expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('responses-export.csv');
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toBe('index,id,start_date,submit_date,Lang,disqualified');
    expect(lines).toHaveLength(3); // header + 2 responses
    expect(lines[1]).toContain('false');
    expect(lines[2]).toContain('true');
  });

  it('exports XLSX (a zip container)', async () => {
    const res = await request(server())
      .get(`${base}/xlsx/0/999999`)
      .set('Authorization', SUPER)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.body.subarray(0, 2).toString('ascii')).toBe('PK');
  });

  it('204 when the range is empty', () =>
    request(server())
      .get(`${base}/csv/500000/500001`)
      .set('Authorization', SUPER)
      .expect(204));

  it('403 for a non-admin role', () =>
    request(server())
      .get(`${base}/csv/0/999999`)
      .set('Authorization', SURVEYOR)
      .expect(403));

  it('401 unauthenticated', () =>
    request(server()).get(`${base}/csv/0/999999`).expect(401));
});
