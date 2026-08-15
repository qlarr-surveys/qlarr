import { INestApplication } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { runValidate } from '../src/engine/engine-runtime';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { bearer, startTestApp, TestApp } from './harness';

const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SURVEYOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const SURVEY = '10000000-0000-0000-0000-000000000001';
const R1 = '20000000-0000-0000-0000-000000000001'; // values + ordering + surveyor
const R2 = '20000000-0000-0000-0000-000000000002'; // event timeline

const token = (roles: string[]) => bearer({ userId: ADMIN, authorities: roles });
const SUPER = token(['super_admin']);
const ANALYST = token(['analyst']);
const SURVEYOR = token(['surveyor']);

// A real processed design (questions + answers) so values resolve to labels.
const design = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'survey-design.json'),
  'utf8',
);
const DESIGN_JSON = JSON.stringify(runValidate(design));
const files = { getText: jest.fn().mockResolvedValue(DESIGN_JSON) };

// R1: Q303fhu.order=2, Q699dtx.order=1 → sortChildren reorders G1's children so
// Q699dtx comes before Q303fhu; Q303fhu has a mask, Q699dtx does not.
const R1_VALUES = {
  'Survey.disqualified': false,
  'Q303fhu.value': 'raw7',
  'Q303fhu.masked_value': 'Seven',
  'Q303fhu.order': 2,
  'Q699dtx.value': 'plain',
  'Q699dtx.order': 1,
};

const R2_VALUES = { 'Q303fhu.value': 'abc' };
const R2_EVENTS = [
  { name: 'ValueTiming', code: 'Q303fhu', time: '2024-01-01 00:00:01' },
  {
    name: 'Navigation',
    from: 'G1',
    to: 'G2',
    direction: { name: 'Next' },
    time: '2024-01-01 00:00:02',
  },
  { name: 'Location', longitude: 1.5, latitude: 2.5, time: '2024-01-01 00:00:03' },
];

describe('Single-response read', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  const addResponse = (
    id: string,
    surveyor: string | null,
    values: object,
    events: object[],
    ip: string | null,
    surveyId: string = SURVEY,
  ) =>
    root.query(
      `INSERT INTO responses
         (id, version, survey_id, preview, surveyor, nav_index, ip_addr,
          start_date, submit_date, lang, events, "values")
       VALUES ($1,1,$2,false,$3,'',$4,'2024-01-01 00:00:00','2024-02-01 00:00:00',
               'en',$5::jsonb,$6::jsonb)`,
      [id, surveyId, surveyor, ip, JSON.stringify(events), JSON.stringify(values)],
    );

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(files),
    });
    app = ctx.app;
    root = ctx.root;

    await root.query(
      `INSERT INTO users (id, first_name, last_name, email, password, deleted, roles)
       VALUES ($1,'First','Last','s@x.com','x',false,ARRAY['surveyor'])`,
      [SURVEYOR_ID],
    );
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
    await addResponse(R1, SURVEYOR_ID, R1_VALUES, [], '1.2.3.4');
    await addResponse(R2, null, R2_VALUES, R2_EVENTS, null);
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const server = () => app.getHttpServer();

  describe('GET /response/:responseId', () => {
    it('resolves values (masked + ordered by the respondent), and metadata', async () => {
      const res = await request(server())
        .get(`/response/${R1}`)
        .set('Authorization', SUPER)
        .expect(200);

      expect(res.body).toMatchObject({
        id: R1,
        lang: 'en',
        preview: false,
        disqualified: false,
        version: 1,
        surveyorName: 'First Last',
        surveyorID: SURVEYOR_ID,
        ipAddress: '1.2.3.4',
        startDate: '2024-01-01 00:00:00',
        submitDate: '2024-02-01 00:00:00',
      });

      // sortChildren applied: Q699dtx (.order=1) precedes Q303fhu (.order=2),
      // reversing their design order.
      expect(res.body.values.map((v: { code: string }) => v.code)).toEqual([
        'Q699dtx',
        'Q303fhu',
      ]);
      const byCode = Object.fromEntries(
        res.body.values.map((v: { code: string }) => [v.code, v]),
      );
      expect(byCode['Q699dtx'].value).toBe('plain'); // no mask → raw value
      expect(byCode['Q303fhu'].value).toBe('Seven (raw7)'); // masked (raw)
      expect(byCode['Q303fhu'].key).toMatch(/^\(Q\d+\)/); // "(<index>) <label>"
    });

    it('keeps only user-facing events (drops value-timing + navigation)', async () => {
      const res = await request(server())
        .get(`/response/${R2}`)
        .set('Authorization', ANALYST)
        .expect(200);
      expect(res.body.events).toHaveLength(1);
      expect(res.body.events[0].name).toBe('Location');
      expect(res.body.surveyorName).toBeNull();
    });

    it('400 for an unknown response id', () =>
      request(server())
        .get(`/response/${'20000000-0000-0000-0000-0000000000ff'}`)
        .set('Authorization', SUPER)
        .expect(400));

    it('403 for a surveyor role', () =>
      request(server()).get(`/response/${R1}`).set('Authorization', SURVEYOR).expect(403));

    it('401 unauthenticated', () =>
      request(server()).get(`/response/${R1}`).expect(401));
  });

  describe('GET /response_with_event/:responseId', () => {
    it('maps every event; value-timing events carry a resolved value', async () => {
      const res = await request(server())
        .get(`/response_with_event/${R2}`)
        .set('Authorization', SUPER)
        .expect(200);

      expect(res.body).toHaveLength(3);
      const value = res.body.find(
        (e: { event: { name: string } }) => e.event.name === 'ValueTiming',
      );
      expect(value.responseValue).toMatchObject({ code: 'Q303fhu', value: 'abc' });
      const nav = res.body.find(
        (e: { event: { name: string } }) => e.event.name === 'Navigation',
      );
      expect(nav.responseValue).toBeNull();
    });

    it('403 for a surveyor role', () =>
      request(server())
        .get(`/response_with_event/${R2}`)
        .set('Authorization', SURVEYOR)
        .expect(403));
  });

  // Single-org: any authenticated user with the right role reads any response.
  it('an analyst can read a response', () =>
    request(server()).get(`/response/${R1}`).set('Authorization', ANALYST).expect(200));
});
