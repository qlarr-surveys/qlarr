import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { runValidate } from '../src/engine/engine-runtime';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { SurveyFolder } from '../src/integrations/filesystem/survey-folder';
import { ADMIN_USER_ID, bearer, startTestApp, TestApp } from './harness';

const SUPER = bearer({ authorities: ['super_admin'] });
const SURVEYOR = bearer({ authorities: ['surveyor'] });

const DESIGN_JSON = JSON.stringify(
  runValidate(readFileSync(join(__dirname, 'fixtures', 'survey-design.json'), 'utf8')),
);

const store = new Map<string, string>();
const key = (surveyId: string, folder: SurveyFolder, name: string) =>
  `${surveyId}/${folder.path}/${name}`;
const files = {
  getText: jest.fn(async (surveyId: string, folder: SurveyFolder, name: string) => {
    const text = store.get(key(surveyId, folder, name));
    if (text === undefined) throw new Error(`missing ${key(surveyId, folder, name)}`);
    return text;
  }),
  uploadText: jest.fn(
    async (surveyId: string, folder: SurveyFolder, body: string, name: string) => {
      store.set(key(surveyId, folder, name), body);
    },
  ),
  delete: jest.fn(async (surveyId: string, folder: SurveyFolder, name: string) => {
    store.delete(key(surveyId, folder, name));
  }),
  deleteSurveyFiles: jest.fn().mockResolvedValue(undefined),
  listSurveyResources: jest.fn().mockResolvedValue([]),
  surveyResourcesFiles: jest.fn().mockResolvedValue([]),
};

describe('Design snapshots', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;
  let seq = 0;

  const server = () => app.getHttpServer();

  const newSurvey = async (createdAgo = "interval '1 minute'"): Promise<string> => {
    const id = `20000000-0000-0000-0000-${String(++seq).padStart(12, '0')}`;
    await root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
          record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,true,$2,-1,'DRAFT','MIXED',
               (now() at time zone 'utc') - ${createdAgo}, now(),
               true,true,true,true)`,
      [id, `snap-${id}`],
    );
    await root.query(
      `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
       VALUES (1,1,$1,now(),'[]',true,false)`,
      [id],
    );
    store.set(key(id, SurveyFolder.Design, '1'), DESIGN_JSON);
    return id;
  };

  const getDesign = async (id: string) =>
    (await request(server()).get(`/survey/${id}/design`).set('Authorization', SUPER).expect(200))
      .body;

  const save = (id: string, diff: Record<string, unknown>, version = 1) =>
    request(server())
      .post(`/survey/${id}/design?version=${version}`)
      .set('Authorization', SUPER)
      .send(diff);

  const edit = async (id: string, label: string) => {
    const { designerInput } = await getDesign(id);
    const g1 = designerInput.state.G1;
    return { G1: { ...g1, content: { ...g1.content, en: { ...g1.content.en, label } } } };
  };

  const removeQuestion = async (id: string, code: string) => {
    const { designerInput } = await getDesign(id);
    const g1 = designerInput.state.G1;
    return { G1: { ...g1, children: g1.children.filter((c: { code: string }) => c.code !== code) } };
  };

  const list = async (id: string) =>
    (
      await request(server())
        .get(`/survey/${id}/design/snapshots`)
        .set('Authorization', SUPER)
        .expect(200)
    ).body;

  const age = (id: string, interval: string) =>
    root.query(
      `UPDATE design_snapshots SET created_at = created_at - interval '${interval}' WHERE survey_id = $1`,
      [id],
    );

  const publish = async (id: string) => {
    const { versionDto } = await getDesign(id);
    await request(server())
      .post(`/survey/${id}/design/publish?version=${versionDto.version}&sub_version=${versionDto.subVersion}`)
      .set('Authorization', SUPER)
      .expect(201);
  };

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(files),
    });
    app = ctx.app;
    root = ctx.root;
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  describe('timer', () => {
    it('takes none while the survey is younger than the interval', async () => {
      const id = await newSurvey();
      await save(id, await edit(id, 'One')).expect(201);
      expect((await list(id)).snapshots).toEqual([]);
    });

    it('snapshots the design BEFORE the save once the interval elapses, then restarts', async () => {
      const id = await newSurvey("interval '31 minutes'");
      await save(id, await edit(id, 'One')).expect(201);

      let { snapshots } = await list(id);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]).toMatchObject({
        reason: 'TIMER',
        details: null,
        createdBy: { id: ADMIN_USER_ID, name: null },
      });

      await save(id, await edit(id, 'Two')).expect(201);
      expect((await list(id)).snapshots).toHaveLength(1);

      await age(id, '31 minutes');
      await save(id, await edit(id, 'Three')).expect(201);
      ({ snapshots } = await list(id));
      expect(snapshots.map((s: { reason: string }) => s.reason)).toEqual(['TIMER', 'TIMER']);
      const restored = await request(server())
        .post(`/survey/${id}/design/snapshots/${snapshots[0].id}/restore?version=1`)
        .set('Authorization', SUPER)
        .expect(201);
      expect(restored.body.designerInput.state.G1.content.en.label).toBe('Two');
    });
  });

  describe('events', () => {
    it('snapshots a question deletion with the deleted codes, once per cooldown', async () => {
      const id = await newSurvey();
      const res = await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
      const codes = res.body.designerInput.componentIndexList.map((c: { code: string }) => c.code);
      expect(codes).not.toContain('Q293sqi');

      await save(id, await removeQuestion(id, 'Q510beg')).expect(201);

      const { snapshots } = await list(id);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]).toMatchObject({ reason: 'DELETE', details: { deleted: ['Q293sqi'] } });
    });

    it('snapshots a change_code with from/to, once per cooldown', async () => {
      const id = await newSurvey();
      await request(server())
        .post(`/survey/${id}/change_code?from=G2&to=G9`)
        .set('Authorization', SUPER)
        .expect(201);
      await request(server())
        .post(`/survey/${id}/change_code?from=G9&to=G8`)
        .set('Authorization', SUPER)
        .expect(201);
      const { snapshots } = await list(id);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]).toMatchObject({
        reason: 'CHANGE_CODE',
        details: { from: 'G2', to: 'G9' },
      });
    });

    it('snapshots a translations import', async () => {
      const id = await newSurvey();
      await request(server())
        .post(`/survey/${id}/translations/import?override_main_lang=true`)
        .set('Authorization', SUPER)
        .attach('file', Buffer.from('code,key,en\nG1,label,Renamed'), 'translations.csv')
        .expect(200);
      const { snapshots } = await list(id);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]).toMatchObject({
        reason: 'TRANSLATIONS_IMPORT',
        details: { updated: 1 },
      });
    });
  });

  describe('restore', () => {
    it('brings back the snapshot design, snapshotting the replaced draft first', async () => {
      const id = await newSurvey();
      const before = await getDesign(id);
      await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
      const [deleted] = (await list(id)).snapshots;

      const res = await request(server())
        .post(`/survey/${id}/design/snapshots/${deleted.id}/restore?version=1`)
        .set('Authorization', SUPER)
        .expect(201);
      expect(res.body.designerInput).toEqual(before.designerInput);
      expect(res.body.versionDto).toMatchObject({ version: 1, subVersion: 3, published: false });

      const { snapshots } = await list(id);
      expect(snapshots[0]).toMatchObject({ reason: 'RESTORE', details: { snapshotId: deleted.id } });
      expect(snapshots).toHaveLength(2);
    });

    it('404 for a snapshot of another survey, 400 for a malformed id', async () => {
      const a = await newSurvey();
      const b = await newSurvey();
      await save(a, await removeQuestion(a, 'Q293sqi')).expect(201);
      const [snap] = (await list(a)).snapshots;
      await request(server())
        .post(`/survey/${b}/design/snapshots/${snap.id}/restore?version=1`)
        .set('Authorization', SUPER)
        .expect(404);
      await request(server())
        .post(`/survey/${b}/design/snapshots/nope/restore?version=1`)
        .set('Authorization', SUPER)
        .expect(400);
    });

    it('400 from a stale version', async () => {
      const id = await newSurvey();
      await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
      const [snap] = (await list(id)).snapshots;
      await request(server())
        .post(`/survey/${id}/design/snapshots/${snap.id}/restore?version=9`)
        .set('Authorization', SUPER)
        .expect(400);
    });

    it('403 for a non-admin role', async () => {
      const id = await newSurvey();
      await request(server())
        .get(`/survey/${id}/design/snapshots`)
        .set('Authorization', SURVEYOR)
        .expect(403);
    });
  });

  describe('publish', () => {
    it('drops the history; the next edits start a new draft without a snapshot', async () => {
      const id = await newSurvey();
      await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
      expect((await list(id)).snapshots).toHaveLength(1);

      await publish(id);
      expect((await list(id)).snapshots).toEqual([]);
      expect((await list(id)).lastPublished).toBeNull();

      await save(id, await removeQuestion(id, 'Q510beg')).expect(201);
      const after = await list(id);
      expect(after.snapshots).toEqual([]);
      expect(after.lastPublished).toMatchObject({ version: 1 });
    });

    it('restore_published drops the draft, leaving the published version as the latest', async () => {
      const id = await newSurvey();
      await publish(id);
      const published = await getDesign(id);

      await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
      const res = await request(server())
        .post(`/survey/${id}/design/restore_published?version=2`)
        .set('Authorization', SUPER)
        .expect(201);
      expect(res.body.designerInput).toEqual(published.designerInput);
      expect(res.body.versionDto).toMatchObject({ version: 1, published: true });
      expect((await getDesign(id)).versionDto).toMatchObject({ version: 1, published: true });
      expect(
        await root.query(`SELECT version FROM versions WHERE survey_id = $1`, [id]),
      ).toEqual([{ version: 1 }]);

      await request(server())
        .post(`/survey/${id}/design/restore_published?version=1`)
        .set('Authorization', SUPER)
        .expect(400);
      const [snap] = (await list(id)).snapshots;
      expect(snap).toMatchObject({ reason: 'RESTORE', details: { publishedVersion: 1 } });
      const restored = await request(server())
        .post(`/survey/${id}/design/snapshots/${snap.id}/restore?version=1`)
        .set('Authorization', SUPER)
        .expect(201);
      expect(restored.body.versionDto).toMatchObject({ version: 2, published: false });
      expect(restored.body.designerInput.state.Q293sqi).toBeUndefined();
    });

    it('restore_published: 400 when there are no unpublished changes', async () => {
      const id = await newSurvey();
      const res = await request(server())
        .post(`/survey/${id}/design/restore_published?version=1`)
        .set('Authorization', SUPER)
        .expect(400);
      expect(res.body.error).toBe('NothingToRevertException');

      await publish(id);
      await request(server())
        .post(`/survey/${id}/design/restore_published?version=1`)
        .set('Authorization', SUPER)
        .expect(400);
    });
  });

  it('keeps at most 100 per survey, evicting the oldest', async () => {
    const id = await newSurvey();
    for (let i = 0; i < 100; i++) {
      await root.query(
        `INSERT INTO design_snapshots (id, survey_id, created_at, reason, data)
         VALUES (gen_random_uuid(), $1, (now() at time zone 'utc') - make_interval(hours => $2),
                 'TIMER', '{}')`,
        [id, 100 - i],
      );
    }
    const [oldest] = await root.query(
      `SELECT id FROM design_snapshots WHERE survey_id = $1 ORDER BY created_at LIMIT 1`,
      [id],
    );
    await request(server())
      .post(`/survey/${id}/change_code?from=G2&to=G9`)
      .set('Authorization', SUPER)
      .expect(201);

    const { snapshots } = await list(id);
    expect(snapshots).toHaveLength(100);
    expect(snapshots[0].reason).toBe('CHANGE_CODE');
    expect(snapshots.map((s: { id: string }) => s.id)).not.toContain(oldest.id);
  });

  it('cascades with the survey', async () => {
    const id = await newSurvey();
    await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
    await request(server()).delete(`/survey/${id}`).set('Authorization', SUPER).expect(204);
    const rows = await root.query(`SELECT 1 FROM design_snapshots WHERE survey_id = $1`, [id]);
    expect(rows).toEqual([]);
  });
});
