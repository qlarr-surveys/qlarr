import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EngineService } from '../src/engine/engine.service';
import { runValidate } from '../src/engine/engine-runtime';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { startTestApp, TestApp } from './harness';

const SURVEY = '10000000-0000-0000-0000-000000000001';
const SURVEY_UNPUBLISHED = '10000000-0000-0000-0000-000000000002';
// A survey with real typed questions (from the design fixture), used to exercise
// respondent-value schema validation.
const SURVEY_TYPED = '10000000-0000-0000-0000-000000000003';

const engine = new EngineService();
const DESIGN_JSON = JSON.stringify(runValidate(engine.newSurvey('Runnable')));
const TYPED_DESIGN_JSON = JSON.stringify(
  runValidate(readFileSync(`${__dirname}/fixtures/survey-design.json`, 'utf8')),
);

const files = {
  // Serve the typed design for SURVEY_TYPED; the empty runnable one otherwise.
  getText: jest
    .fn()
    .mockImplementation((surveyId: string) =>
      Promise.resolve(surveyId === SURVEY_TYPED ? TYPED_DESIGN_JSON : DESIGN_JSON),
    ),
  deleteUnusedResponseFiles: jest.fn().mockResolvedValue(undefined),
};

describe('Survey run — start + navigate', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  const addSurvey = (id: string, status: string, published: boolean) =>
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
           VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,$2)`,
          [id, published],
        ),
      );

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(files),
    });
    app = ctx.app;
    root = ctx.root;

    await addSurvey(SURVEY, 'ACTIVE', true);
    await addSurvey(SURVEY_UNPUBLISHED, 'ACTIVE', false);
    await addSurvey(SURVEY_TYPED, 'ACTIVE', true);
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const server = () => app.getHttpServer();

  it('starts a response (public, no auth) and persists it', async () => {
    const res = await request(server())
      .post(`/survey/${SURVEY}/run/start`)
      .send({})
      .expect(200);

    expect(res.body.responseId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(res.body.lang).toEqual({ code: 'en', name: 'English' });
    expect(res.body.navigationIndex.name).toBeDefined();
    expect(res.body.saveTimings).toBe(true);
    expect(res.body.navigationData.navigationMode).toBeDefined();

    // Persisted: index assigned by the DB trigger, a Navigation timing event, IP saved.
    const [row] = await root.query(
      `SELECT survey_response_index, ip_addr, events, jsonb_typeof(events) AS et
       FROM responses WHERE id = $1`,
      [res.body.responseId],
    );
    expect(row.survey_response_index).toBeGreaterThanOrEqual(1);
    expect(row.ip_addr).toBeTruthy();
    expect(row.events).toHaveLength(1);
    expect(row.events[0].name).toBe('Navigation');
  });

  it('navigates an existing response forward', async () => {
    const start = await request(server()).post(`/survey/${SURVEY}/run/start`).send({}).expect(200);
    const responseId = start.body.responseId;

    const res = await request(server())
      .post(`/survey/${SURVEY}/run/navigate`)
      .send({ responseId, navigationDirection: { name: 'NEXT' }, values: {}, events: [] })
      .expect(200);
    expect(res.body.responseId).toBe(responseId);
    // NEXT must actually advance — from the first group to the survey end — not
    // stay put (regression: uppercase direction names were unmapped → Start).
    expect(res.body.navigationIndex.name).toBe('end');

    // The stored nav_index reflects the new position.
    const [row] = await root.query(
      `SELECT nav_index FROM responses WHERE id = $1`,
      [responseId],
    );
    expect(JSON.parse(row.nav_index)).toEqual(res.body.navigationIndex);
  });

  it('400 navigating an unknown response', () =>
    request(server())
      .post(`/survey/${SURVEY}/run/navigate`)
      .send({
        responseId: '99999999-9999-9999-9999-999999999999',
        navigationDirection: { name: 'NEXT' },
      })
      .expect(400));

  // Regression: an omitted responseId must not degrade typeorm's findOne to
  // `SELECT … LIMIT 1` (which would return — and then overwrite — an arbitrary
  // tenant response). It has to 400 and leave the existing row untouched.
  it('400 navigating with a missing responseId, without touching any row', async () => {
    const start = await request(server()).post(`/survey/${SURVEY}/run/start`).send({}).expect(200);
    const victimId = start.body.responseId;
    const [before] = await root.query(
      `SELECT nav_index FROM responses WHERE id = $1`,
      [victimId],
    );

    await request(server())
      .post(`/survey/${SURVEY}/run/navigate`)
      .send({ navigationDirection: { name: 'NEXT' } })
      .expect(400);

    const [after] = await root.query(
      `SELECT nav_index FROM responses WHERE id = $1`,
      [victimId],
    );
    expect(after.nav_index).toBe(before.nav_index);
  });

  it('400 starting a survey with no published version', () =>
    request(server()).post(`/survey/${SURVEY_UNPUBLISHED}/run/start`).send({}).expect(400));

  // Regression: respondent values must be schema-type-checked
  // (validateSchema). A value whose runtime type contradicts the design's
  // dataType has to 400 (WrongValueType), not get stringified into the engine
  // and persisted — which would corrupt exports and analytics.
  it('400 navigating with a wrong-typed value (schema validation)', async () => {
    const schema = JSON.parse(TYPED_DESIGN_JSON).schema as Array<{
      componentCode: string;
      columnName: string;
      dataType: unknown;
    }>;
    const stringField = schema.find(
      (f) => f.dataType === 'string' && String(f.columnName) === 'VALUE',
    );
    expect(stringField).toBeDefined();
    const key = `${stringField!.componentCode}.value`;

    const start = await request(server())
      .post(`/survey/${SURVEY_TYPED}/run/start`)
      .send({})
      .expect(200);

    const res = await request(server())
      .post(`/survey/${SURVEY_TYPED}/run/navigate`)
      .send({
        responseId: start.body.responseId,
        navigationDirection: { name: 'NEXT' },
        // A string field handed a nested object → WrongValueType.
        values: { [key]: { nested: [1, 2, 3] } },
      })
      .expect(400);
    expect(res.body.error).toBe('WrongValueType');
  });
});
