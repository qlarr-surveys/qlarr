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

  /** The query a client holding the current design sends. */
  const at = async (id: string) => {
    const { versionDto } = await getDesign(id);
    return `version=${versionDto.version}&sub_version=${versionDto.subVersion}`;
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

  describe('every minute', () => {
    it('snapshots the design BEFORE the first save, then at most once a minute', async () => {
      const id = await newSurvey();
      await save(id, await edit(id, 'One')).expect(201);

      let { snapshots } = await list(id);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]).toMatchObject({ createdBy: { id: ADMIN_USER_ID, name: null } });

      await save(id, await edit(id, 'Two')).expect(201);
      expect((await list(id)).snapshots).toHaveLength(1);

      await age(id, '1 minute');
      await save(id, await edit(id, 'Three')).expect(201);
      ({ snapshots } = await list(id));
      expect(snapshots).toHaveLength(2);
      const restored = await request(server())
        .post(`/survey/${id}/design/snapshots/${snapshots[0].id}/restore?${await at(id)}`)
        .set('Authorization', SUPER)
        .expect(201);
      expect(restored.body.designerInput.state.G1.content.en.label).toBe('Two');
    });

    it('thins with age: all from the last hour, the newest per 30 minutes for a day, the newest per day after', async () => {
      const id = await newSurvey();
      const now = "(now() at time zone 'utc')";
      // The start of the 30-minute block 3 hours ago, and of the day 3 days ago.
      const block = `(to_timestamp(floor(extract(epoch FROM ${now} - interval '3 hours') / 1800) * 1800) at time zone 'utc')`;
      const day = `date_trunc('day', ${now} - interval '3 days')`;
      const snap = (n: number) => `40000000-0000-0000-0000-${String(seq).padStart(6, '0')}00000${n}`;
      const insert = (n: number, createdAt: string) =>
        root.query(
          `INSERT INTO design_snapshots (id, survey_id, created_at, saved_at, data)
           VALUES ($1, $2, ${createdAt}, ${createdAt}, '{}')`,
          [snap(n), id],
        );
      await insert(1, `${now} - interval '10 minutes'`);
      await insert(2, `${now} - interval '20 minutes'`);
      await insert(3, `${block} + interval '1 minute'`);
      await insert(4, `${block} + interval '5 minutes'`);
      await insert(5, `${day} + interval '1 hour'`);
      await insert(6, `${day} + interval '5 hours'`);

      await save(id, await edit(id, 'One')).expect(201);

      const ids = (await list(id)).snapshots.map((s: { id: string }) => s.id);
      expect(ids.slice(1)).toEqual([1, 2, 4, 6].map(snap));
    });
  });

  describe('saved time', () => {
    it("shows when the snapshotted design was saved, not when the next edit took it", async () => {
      const id = await newSurvey("interval '3 hours'");
      await root.query(
        `UPDATE versions SET last_modified = last_modified - interval '40 minutes' WHERE survey_id = $1`,
        [id],
      );
      const xSavedAt = (await getDesign(id)).versionDto.lastModified;

      await save(id, await edit(id, 'Y')).expect(201);
      await save(id, await edit(id, 'Y, more')).expect(201);

      const { snapshots } = await list(id);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].savedAt).toBe(xSavedAt);
    });
  });

  describe('other saves', () => {
    it('a rename takes one too, at most once a minute', async () => {
      const id = await newSurvey();
      await request(server())
        .post(`/survey/${id}/change_code?from=G2&to=G9`)
        .set('Authorization', SUPER)
        .expect(201);
      await request(server())
        .post(`/survey/${id}/change_code?from=G9&to=G8`)
        .set('Authorization', SUPER)
        .expect(201);
      expect((await list(id)).snapshots).toHaveLength(1);
    });

    it('a translations import takes one too', async () => {
      const id = await newSurvey();
      await request(server())
        .post(`/survey/${id}/translations/import?override_main_lang=true`)
        .set('Authorization', SUPER)
        .attach('file', Buffer.from('code,key,en\nG1,label,Renamed'), 'translations.csv')
        .expect(200);
      expect((await list(id)).snapshots).toHaveLength(1);
    });
  });

  describe('restore', () => {
    it('brings back the snapshot design, keeping neither the replaced draft nor the restored point', async () => {
      const id = await newSurvey();
      const before = await getDesign(id);
      await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
      const [deleted] = (await list(id)).snapshots;

      const res = await request(server())
        .post(`/survey/${id}/design/snapshots/${deleted.id}/restore?${await at(id)}`)
        .set('Authorization', SUPER)
        .expect(201);
      expect(res.body.designerInput).toEqual(before.designerInput);
      expect(res.body.versionDto).toMatchObject({ version: 1, subVersion: 3, published: false });

      expect((await list(id)).snapshots).toEqual([]);
    });

    const snapshotData = () => JSON.stringify(JSON.parse(DESIGN_JSON).survey);
    const snapId = (n: number) => `30000000-0000-0000-0000-${String(seq).padStart(6, '0')}00000${n}`;

    it('deletes the restored point and the ones after it, breaking same-second ties by id', async () => {
      const id = await newSurvey();
      const data = snapshotData();
      const snap = snapId;
      const insert = (n: number, ago: string) =>
        root.query(
          `INSERT INTO design_snapshots (id, survey_id, created_at, saved_at, data)
           VALUES ($1, $2, date_trunc('second', now() at time zone 'utc') - interval '${ago}', date_trunc('second', now() at time zone 'utc') - interval '${ago}',
                   $3)`,
          [snap(n), id, data],
        );
      await insert(1, '3 hours');
      await insert(2, '2 hours');
      await insert(3, '1 hour'); // same second as 4; 3 sorts before it by id
      await insert(4, '1 hour');
      await insert(5, '30 minutes');
      expect((await list(id)).snapshots.map((s: { id: string }) => s.id)).toEqual(
        [5, 4, 3, 2, 1].map(snap),
      );

      await request(server())
        .post(`/survey/${id}/design/snapshots/${snap(4)}/restore?${await at(id)}`)
        .set('Authorization', SUPER)
        .expect(201);

      expect((await list(id)).snapshots.map((s: { id: string }) => s.id)).toEqual(
        [3, 2, 1].map(snap),
      );
    });

    it('restarts the minute, so an edit right after does not snapshot the restored design', async () => {
      const id = await newSurvey("interval '3 hours'");
      await root.query(
        `INSERT INTO design_snapshots (id, survey_id, created_at, saved_at, data)
         VALUES ($1, $2, (now() at time zone 'utc') - interval '2 hours', (now() at time zone 'utc') - interval '2 hours', $3)`,
        [snapId(1), id, snapshotData()],
      );
      await request(server())
        .post(`/survey/${id}/design/snapshots/${snapId(1)}/restore?${await at(id)}`)
        .set('Authorization', SUPER)
        .expect(201);

      await save(id, await edit(id, 'After restore')).expect(201);
      expect((await list(id)).snapshots).toEqual([]);

      await root.query(
        `UPDATE surveys SET last_restored_at = last_restored_at - interval '1 minute' WHERE id = $1`,
        [id],
      );
      await save(id, await edit(id, 'Later')).expect(201);
      expect((await list(id)).snapshots).toHaveLength(1);
    });

    it('previews a snapshot without touching the draft', async () => {
      const id = await newSurvey();
      const before = await getDesign(id);
      await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
      const [snap] = (await list(id)).snapshots;
      const draft = await getDesign(id);

      const res = await request(server())
        .get(`/survey/${id}/design/snapshots/${snap.id}`)
        .set('Authorization', SUPER)
        .expect(200);
      expect(res.body.designerInput).toEqual(before.designerInput);
      expect(await getDesign(id)).toEqual(draft);
      expect((await list(id)).snapshots).toHaveLength(1);

      await request(server())
        .get(`/survey/${id}/design/snapshots/${snap.id}`)
        .set('Authorization', SURVEYOR)
        .expect(403);
      await request(server())
        .get(`/survey/${(await newSurvey())}/design/snapshots/${snap.id}`)
        .set('Authorization', SUPER)
        .expect(404);
    });

    it('404 for a snapshot of another survey, 400 for a malformed id', async () => {
      const a = await newSurvey();
      const b = await newSurvey();
      await save(a, await removeQuestion(a, 'Q293sqi')).expect(201);
      const [snap] = (await list(a)).snapshots;
      await request(server())
        .post(`/survey/${b}/design/snapshots/${snap.id}/restore?${await at(b)}`)
        .set('Authorization', SUPER)
        .expect(404);
      await request(server())
        .post(`/survey/${b}/design/snapshots/nope/restore?${await at(b)}`)
        .set('Authorization', SUPER)
        .expect(400);
    });

    it('400 from a stale version', async () => {
      const id = await newSurvey();
      await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
      const [snap] = (await list(id)).snapshots;
      await request(server())
        .post(`/survey/${id}/design/snapshots/${snap.id}/restore?version=9&sub_version=2`)
        .set('Authorization', SUPER)
        .expect(400);
    });

    it('400 from a stale sub-version: a save since the client read wins', async () => {
      const id = await newSurvey();
      await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
      const [snap] = (await list(id)).snapshots;
      const stale = await at(id);
      await save(id, await edit(id, 'Other tab')).expect(201);

      const res = await request(server())
        .post(`/survey/${id}/design/snapshots/${snap.id}/restore?${stale}`)
        .set('Authorization', SUPER)
        .expect(400);
      expect(res.body.error).toBe('DesignOutOfSyncException');
      expect((await getDesign(id)).designerInput.state.G1.content.en.label).toBe('Other tab');
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

    it('restore_published drops the draft and the whole history, leaving the published version', async () => {
      const id = await newSurvey();
      await publish(id);
      const published = await getDesign(id);

      await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
      await save(id, await removeQuestion(id, 'Q510beg'), 2).expect(201);
      expect((await list(id)).snapshots).toHaveLength(1);
      const res = await request(server())
        .post(`/survey/${id}/design/restore_published?${await at(id)}`)
        .set('Authorization', SUPER)
        .expect(201);
      expect(res.body.designerInput).toEqual(published.designerInput);
      expect(res.body.versionDto).toMatchObject({ version: 1, published: true });
      expect((await getDesign(id)).versionDto).toMatchObject({ version: 1, published: true });
      expect(
        await root.query(`SELECT version FROM versions WHERE survey_id = $1`, [id]),
      ).toEqual([{ version: 1 }]);

      expect((await list(id)).snapshots).toEqual([]);

      await request(server())
        .post(`/survey/${id}/design/restore_published?${await at(id)}`)
        .set('Authorization', SUPER)
        .expect(400);
    });

    it('restore_published: 400 from a stale sub-version, keeping the draft', async () => {
      const id = await newSurvey();
      await publish(id);
      await save(id, await removeQuestion(id, 'Q293sqi')).expect(201);
      const stale = await at(id);
      await save(id, await edit(id, 'Other tab'), 2).expect(201);

      const res = await request(server())
        .post(`/survey/${id}/design/restore_published?${stale}`)
        .set('Authorization', SUPER)
        .expect(400);
      expect(res.body.error).toBe('DesignOutOfSyncException');
      expect((await getDesign(id)).versionDto).toMatchObject({ version: 2, published: false });
    });

    it('restore_published: 400 when there are no unpublished changes', async () => {
      const id = await newSurvey();
      const res = await request(server())
        .post(`/survey/${id}/design/restore_published?${await at(id)}`)
        .set('Authorization', SUPER)
        .expect(400);
      expect(res.body.error).toBe('NothingToRevertException');

      await publish(id);
      await request(server())
        .post(`/survey/${id}/design/restore_published?${await at(id)}`)
        .set('Authorization', SUPER)
        .expect(400);
    });
  });

  it('keeps at most 100 per survey, evicting the oldest', async () => {
    const id = await newSurvey();
    // 100 snapshots inside the last hour (so none is thinned), the newest 90s old.
    for (let i = 0; i < 100; i++) {
      await root.query(
        `INSERT INTO design_snapshots (id, survey_id, created_at, saved_at, data)
         VALUES (gen_random_uuid(), $1,
                 (now() at time zone 'utc') - make_interval(secs => $2),
                 (now() at time zone 'utc') - make_interval(secs => $2),
                 '{}')`,
        [id, 90 + i * 30],
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
    expect(snapshots[0].createdBy).toMatchObject({ id: ADMIN_USER_ID });
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
