import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EngineService } from '../src/engine/engine.service';
import { runValidate } from '../src/engine/engine-runtime';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { bearer, startTestApp, TestApp } from './harness';

const SURVEY = '10000000-0000-0000-0000-000000000001';
const SURVEY_UNPUBLISHED = '10000000-0000-0000-0000-000000000002';
// A survey with real typed questions (from the design fixture), used to exercise
// respondent-value schema validation.
const SURVEY_TYPED = '10000000-0000-0000-0000-000000000003';
// The typed design with its group and one question hidden by relevance logic.
const SURVEY_HIDDEN = '10000000-0000-0000-0000-000000000004';
const HIDDEN_QUESTION = 'Q880htp';

const SUPER = bearer({ authorities: ['super_admin'] });

const engine = new EngineService();
const DESIGN_JSON = JSON.stringify(runValidate(engine.newSurvey('Runnable')));
const TYPED_DESIGN_JSON = JSON.stringify(
  runValidate(readFileSync(`${__dirname}/fixtures/survey-design.json`, 'utf8')),
);

const HIDDEN_DESIGN_JSON = (() => {
  const design = JSON.parse(readFileSync(`${__dirname}/fixtures/survey-design.json`, 'utf8'));
  const hide = (component: { instructionList: object[] }, text: string) =>
    component.instructionList.push({
      code: 'conditional_relevance',
      text,
      returnType: 'boolean',
      isActive: true,
    });
  const group = design.groups[0];
  hide(group, 'false');
  hide(
    group.questions.find((q: { code: string }) => q.code === HIDDEN_QUESTION),
    'Q303fhu.value === "show"',
  );
  return JSON.stringify(runValidate(JSON.stringify(design)));
})();

const designs: Record<string, string> = {
  [SURVEY_TYPED]: TYPED_DESIGN_JSON,
  [SURVEY_HIDDEN]: HIDDEN_DESIGN_JSON,
};

const files = {
  // Serve each survey's design; the empty runnable one by default.
  getText: jest
    .fn()
    .mockImplementation((surveyId: string) =>
      Promise.resolve(designs[surveyId] ?? DESIGN_JSON),
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
    await addSurvey(SURVEY_HIDDEN, 'DRAFT', false);
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

  it('keeps the submit date when the end page is reloaded', async () => {
    const start = await request(server()).post(`/survey/${SURVEY}/run/start`).send({}).expect(200);
    const responseId = start.body.responseId;
    const navigate = (name: string) =>
      request(server())
        .post(`/survey/${SURVEY}/run/navigate`)
        .send({ responseId, navigationDirection: { name }, values: {}, events: [] })
        .expect(200);

    await navigate('NEXT');
    await root.query(
      `UPDATE responses SET submit_date = '2024-02-01 10:00:00' WHERE id = $1`,
      [responseId],
    );
    const res = await navigate('RESUME');
    expect(res.body.navigationIndex.name).toBe('end');

    const [row] = await root.query(
      `SELECT to_char(submit_date, 'YYYY-MM-DD HH24:MI:SS') AS submit_date
       FROM responses WHERE id = $1`,
      [responseId],
    );
    expect(row.submit_date).toBe('2024-02-01 10:00:00');
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

  describe('single-question preview (start-at)', () => {
    const startAt = (questionId: string, auth = true) => {
      const req = request(server()).post(`/survey/${SURVEY_HIDDEN}/preview/start-at`);
      return (auth ? req.set('Authorization', SUPER) : req).send({ questionId });
    };
    const responseCount = async () =>
      Number(
        (
          await root.query(`SELECT count(*) AS n FROM responses WHERE survey_id = $1`, [
            SURVEY_HIDDEN,
          ])
        )[0].n,
      );

    it('serves a hidden question in a hidden group, alone and forced relevant', async () => {
      const res = await startAt(HIDDEN_QUESTION).expect(200);

      expect(res.body.responseId).toBeNull();
      expect(res.body.navigationIndex).toMatchObject({
        name: 'question',
        questionId: HIDDEN_QUESTION,
      });
      // The whole survey comes back; only the target is in the current navigation.
      type Component = { code: string; inCurrentNavigation: boolean };
      const groups = res.body.survey.groups as (Component & { questions?: Component[] })[];
      const shown = groups
        .filter((g) => g.inCurrentNavigation)
        .map((g) => [g.code, (g.questions ?? []).filter((q) => q.inCurrentNavigation).map((q) => q.code)]);
      expect(shown).toEqual([['G1', [HIDDEN_QUESTION]]]);
      expect(res.body.state.qlarrVariables.G1.relevance).toBe(true);
      expect(res.body.state.qlarrVariables[HIDDEN_QUESTION].relevance).toBe(true);
    });

    it('leaves the relevance logic alone outside the target question', async () => {
      const res = await startAt('Q303fhu').expect(200);
      expect(res.body.state.qlarrVariables[HIDDEN_QUESTION].relevance).toBe(false);
    });

    it('saves no response', async () => {
      const before = await responseCount();
      await startAt(HIDDEN_QUESTION).expect(200);
      expect(await responseCount()).toBe(before);
    });

    it('404 QuestionNotFound for an unknown question', async () => {
      const res = await startAt('Qnope').expect(404);
      expect(res.body.error).toBe('QuestionNotFound');
    });

    it('401 when unauthenticated', () => startAt(HIDDEN_QUESTION, false).expect(401));

    it('400 StartAtNotAllowed through the respondent navigate route', async () => {
      const start = await request(server()).post(`/survey/${SURVEY}/run/start`).send({}).expect(200);
      const res = await request(server())
        .post(`/survey/${SURVEY}/run/navigate`)
        .send({
          responseId: start.body.responseId,
          navigationDirection: {
            name: 'START_AT',
            navigationIndex: { name: 'question', questionId: 'Q1' },
          },
        })
        .expect(400);
      expect(res.body.error).toBe('StartAtNotAllowed');
    });
  });
});
