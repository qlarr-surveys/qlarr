import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EngineService } from '../src/engine/engine.service';
import { runNavigate, runValidate } from '../src/engine/engine-runtime';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { bearer, startTestApp, TestApp } from './harness';

const SURVEYOR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SURVEY = '10000000-0000-0000-0000-000000000001';
const SURVEY_DRAFT = '10000000-0000-0000-0000-000000000002';
const SURVEY_QUOTA = '10000000-0000-0000-0000-000000000003';

const token = (roles: string[]) =>
  bearer({ userId: SURVEYOR_ID, authorities: roles });
const SURVEYOR = token(['surveyor']);

// A blank survey's OFFLINE navigation lands at End with a valid state; capture
// its index + saved values to build a genuinely valid offline response payload.
const engine = new EngineService();
const DESIGN_JSON = JSON.stringify(runValidate(engine.newSurvey('Offline')));
const endNav = runNavigate({
  values: '{}',
  processedSurvey: DESIGN_JSON,
  navigationDirection: { name: 'START' },
  navigationIndex: null,
  lang: 'en',
  navigationMode: 'ALL_IN_ONE',
  skipInvalid: false,
  surveyMode: 'OFFLINE',
});

const validPayload = () => ({
  versionId: 1,
  lang: 'en',
  values: endNav.toSave,
  startDate: '2024-01-01 00:00:00',
  submitDate: '2024-02-01 00:00:00',
  userId: SURVEYOR_ID,
  navigationIndex: endNav.navigationIndex,
  events: [],
});

// A survey with one text question and a quota on it ("male").
const quotaDesign = JSON.parse(engine.newSurvey('Offline quota'));
quotaDesign.groups[0].questions = [
  {
    code: 'Q1',
    type: 'text',
    instructionList: [{ code: 'value', text: '', returnType: 'string', isActive: false }],
  },
];
quotaDesign.quotas = [
  { code: 'QT1', label: 'Male', limit: 1, condition: { logic: { '==': [{ var: 'Q1' }, 'male'] } } },
];
quotaDesign.instructionList = [
  { code: 'quota_QT1', text: 'Q1.value == "male"', returnType: 'boolean', isActive: true },
];
const QUOTA_DESIGN_JSON = JSON.stringify(runValidate(JSON.stringify(quotaDesign)));
const navigateQuota = (values: object, navigationIndex: unknown, direction: string) =>
  runNavigate({
    values: JSON.stringify(values),
    processedSurvey: QUOTA_DESIGN_JSON,
    navigationDirection: { name: direction },
    navigationIndex,
    lang: 'en',
    navigationMode: 'GROUP_BY_GROUP',
    skipInvalid: false,
    surveyMode: 'OFFLINE',
  } as Parameters<typeof runNavigate>[0]);
const quotaEnd = navigateQuota(
  { 'Q1.value': 'male' },
  navigateQuota({}, null, 'START').navigationIndex,
  'NEXT',
);

const files = {
  getText: jest.fn((surveyId: string) =>
    Promise.resolve(surveyId === SURVEY_QUOTA ? QUOTA_DESIGN_JSON : DESIGN_JSON),
  ),
  deleteUnusedResponseFiles: jest.fn().mockResolvedValue(undefined),
};

describe('Offline survey response upload', () => {
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
        [id, `n-${id}`, status],
      )
      .then(() =>
        root.query(
          `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
           VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,true)`,
          [id],
        ),
      );

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(files),
    });
    app = ctx.app;
    root = ctx.root;

    // surveyor FK → users(id): the offline response's userId must reference a user.
    await root.query(
      `INSERT INTO users (id, first_name, last_name, email, password, deleted, roles)
       VALUES ($1,'S','R','s@x.com','x',false,ARRAY['surveyor'])`,
      [SURVEYOR_ID],
    );
    await addSurvey(SURVEY, 'ACTIVE');
    await addSurvey(SURVEY_DRAFT, 'DRAFT');
    await addSurvey(SURVEY_QUOTA, 'ACTIVE');
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  beforeEach(() => jest.clearAllMocks());
  const server = () => app.getHttpServer();

  const url = (responseId: string) => `/survey/${SURVEY}/response/${responseId}/upload`;

  it('syncs a valid offline response, persists it, and returns counts', async () => {
    const responseId = '30000000-0000-0000-0000-000000000001';
    const res = await request(server())
      .post(url(responseId))
      .set('Authorization', SURVEYOR)
      .send(validPayload())
      .expect(200);

    expect(res.body).toEqual({ completeResponseCount: 1, userResponsesCount: 1 });

    const [row] = await root.query(
      `SELECT surveyor, submit_date, preview, nav_index, "values"
       FROM responses WHERE id = $1`,
      [responseId],
    );
    expect(row.surveyor).toBe(SURVEYOR_ID);
    expect(row.submit_date).not.toBeNull();
    expect(row.preview).toBe(false);
    expect(JSON.parse(row.nav_index).name).toBe('end');
    // Unused response files are pruned on sync.
    expect(files.deleteUnusedResponseFiles).toHaveBeenCalledTimes(1);
  });

  it('saves quota membership from the backend engine, keeping the device disqualified flag', async () => {
    expect(quotaEnd.navigationIndex.name).toBe('end');
    const upload = async (responseId: string, values: object) => {
      await request(server())
        .post(`/survey/${SURVEY_QUOTA}/response/${responseId}/upload`)
        .set('Authorization', SURVEYOR)
        .send({ ...validPayload(), values, navigationIndex: quotaEnd.navigationIndex })
        .expect(200);
      const [row] = await root.query(
        `SELECT "values", quota_codes FROM responses WHERE id = $1`,
        [responseId],
      );
      return row;
    };
    const male = { 'Q1.value': 'male', 'Survey.disqualified': false };

    // A tampered device claims it's not in the quota.
    const faked = await upload('30000000-0000-0000-0000-0000000000a1', {
      ...male,
      'Survey.quota_QT1': false,
    });
    expect(faked.values['Survey.quota_QT1']).toBe(true);
    expect(faked.quota_codes).toEqual(['QT1']);

    // An older app doesn't send quota membership at all.
    const old = await upload('30000000-0000-0000-0000-0000000000a2', male);
    expect(old.values['Survey.quota_QT1']).toBe(true);

    // Not a member, whatever the device says.
    const female = await upload('30000000-0000-0000-0000-0000000000a3', {
      'Q1.value': 'female',
      'Survey.quota_QT1': true,
      'Survey.disqualified': false,
    });
    expect(female.values['Survey.quota_QT1']).toBe(false);
    expect(female.quota_codes).toEqual([]);

    // The device screened the respondent out: that stays, so it doesn't count.
    const screenedOut = await upload('30000000-0000-0000-0000-0000000000a4', {
      ...male,
      'Survey.disqualified': true,
    });
    expect(screenedOut.values['Survey.disqualified']).toBe(true);
    expect(screenedOut.values['Survey.quota_QT1']).toBe(true);
    expect(screenedOut.quota_codes).toEqual([]);
  });

  it('accepts Kotlin/Jackson LocalDateTime arrays for start/submit dates', async () => {
    // The Android client is JVM/Jackson and serializes LocalDateTime as
    // [year, month(1-based), day, hour, minute, second, nano] — not a string.
    const responseId = '30000000-0000-0000-0000-000000000006';
    await request(server())
      .post(url(responseId))
      .set('Authorization', SURVEYOR)
      .send({
        ...validPayload(),
        startDate: [2024, 1, 1, 0, 0, 0],
        submitDate: [2026, 7, 29, 20, 38, 10, 828000000],
      })
      .expect(200);

    // to_char reproduces the stored wall-clock literal regardless of the pg
    // client's timezone, so the assertion is stable across environments.
    const [row] = await root.query(
      `SELECT to_char(start_date, 'YYYY-MM-DD HH24:MI:SS') AS start_date,
              to_char(submit_date, 'YYYY-MM-DD HH24:MI:SS') AS submit_date
       FROM responses WHERE id = $1`,
      [responseId],
    );
    expect(row.start_date).toBe('2024-01-01 00:00:00');
    expect(row.submit_date).toBe('2026-07-29 20:38:10');
  });

  it('rejects a response whose navigation index is not at End (400)', async () => {
    const res = await request(server())
      .post(url('30000000-0000-0000-0000-000000000002'))
      .set('Authorization', SURVEYOR)
      .send({ ...validPayload(), navigationIndex: { name: 'Groups', groupId: 'G1' } })
      .expect(400);
    expect(res.body.error).toBe('IncompleteResponse');
  });

  it('rejects a response id that was already synced (400)', async () => {
    const responseId = '30000000-0000-0000-0000-000000000003';
    // The responses insert trigger (assign_survey_response_index) resolves the
    // per-survey sequence via search_path; the endpoint already created it in
    // the public schema, so this raw insert (also public) hits the same sequence.
    await root.query(
      `INSERT INTO responses
         (id, version, survey_id, preview, surveyor, nav_index, start_date, submit_date, lang, events, "values")
       VALUES ($1,1,$2,false,NULL,'','2024-01-01 00:00:00','2024-02-01 00:00:00','en','[]'::jsonb,'{}'::jsonb)`,
      [responseId, SURVEY],
    );
    const res = await request(server())
      .post(url(responseId))
      .set('Authorization', SURVEYOR)
      .send(validPayload())
      .expect(400);
    expect(res.body.error).toBe('ResponseAlreadySyncedException');
  });

  it('rejects syncing to a non-active survey (400)', async () => {
    const res = await request(server())
      .post(`/survey/${SURVEY_DRAFT}/response/30000000-0000-0000-0000-000000000004/upload`)
      .set('Authorization', SURVEYOR)
      .send(validPayload())
      .expect(400);
    expect(res.body.error).toBe('SurveyIsNotActiveException');
  });

  it('401 without a token', async () => {
    await request(server())
      .post(url('30000000-0000-0000-0000-000000000005'))
      .send(validPayload())
      .expect(401);
  });
});
