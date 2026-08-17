import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { FILE_HELPER } from '../src/integrations/filesystem/file-helper';
import { bearer, startTestApp, TestApp } from './harness';

const ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SVR = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SURVEY = '10000000-0000-0000-0000-000000000001';
const R_COMPLETE = '20000000-0000-0000-0000-000000000001';
const R_INCOMPLETE = '20000000-0000-0000-0000-000000000002';
const R_PREVIEW = '20000000-0000-0000-0000-000000000003';
const R_DISQ = '20000000-0000-0000-0000-000000000004';

const token = (userId: string, roles: string[]) =>
  bearer({ userId, authorities: roles });

const SUPER = token(ADMIN, ['super_admin']);
const ANALYST = token(ADMIN, ['analyst']);
const SURVEYOR_ROLE = token(ADMIN, ['surveyor']);

const files = {
  responseFiles: jest.fn().mockResolvedValue([]),
  delete: jest.fn().mockResolvedValue(undefined),
  // getProcessedSurvey reads the processed-design JSON via getText.
  getText: jest.fn(),
};

describe('Response summary + delete', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  const addResponse = (
    id: string,
    preview: boolean,
    submitDate: string | null,
    surveyor: string | null,
    startDate: string,
    values = '{}',
  ) =>
    root.query(
      `INSERT INTO responses
         (id, version, survey_id, preview, surveyor, nav_index, start_date, submit_date, lang, events, "values")
       VALUES ($1,1,$2,$3,$4,'',$5,$6,'en','[]'::jsonb,$7::jsonb)`,
      [id, SURVEY, preview, surveyor, startDate, submitDate, values],
    );

  beforeAll(async () => {
    ctx = await startTestApp({
      overrides: (b) => b.overrideProvider(FILE_HELPER).useValue(files),
    });
    app = ctx.app;
    root = ctx.root;

    await root.query(
      `INSERT INTO users (id, first_name, last_name, email, password, deleted, roles, is_confirmed)
       VALUES ($1,'Sam','Surveyor',$2,'x',false,ARRAY['surveyor']::varchar[],true)`,
      [SVR, `${SVR}@x.com`],
    );
    await root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
          record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,true,'s',-1,'DRAFT','MIXED','2024-01-01 00:00:00','2024-01-01 00:00:00',
               true,true,true,true)`,
      [SURVEY],
    );
    await root.query(
      `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
       VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,true)`,
      [SURVEY],
    );

    await addResponse(R_COMPLETE, false, '2024-02-01 10:00:00', SVR, '2024-01-01 00:00:01');
    await addResponse(R_INCOMPLETE, false, null, null, '2024-01-01 00:00:02');
    await addResponse(R_PREVIEW, true, '2024-02-01 10:00:00', SVR, '2024-01-01 00:00:03');
    await addResponse(R_DISQ, false, '2024-02-01 10:00:00', SVR, '2024-01-01 00:00:04',
      '{"Survey.disqualified": true}');

  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const server = () => app.getHttpServer();
  const summary = (qs = '') =>
    request(server()).get(`/survey/${SURVEY}/response/summary${qs}`).set('Authorization', SUPER);

  describe('GET summary — filtering', () => {
    it('ALL returns every response', () =>
      summary().expect(200).expect((r) => {
        expect(r.body.totalCount).toBe(4);
        expect(r.body.responses).toHaveLength(4);
        expect(r.body.canExportFiles).toBe(false);
      }));

    it('COMPLETE returns submitted non-preview responses', () =>
      summary('?status=complete').expect(200).expect((r) => expect(r.body.totalCount).toBe(2)));

    it('INCOMPLETE returns unsubmitted non-preview responses', () =>
      summary('?status=incomplete').expect(200).expect((r) => expect(r.body.totalCount).toBe(1)));

    it('PREVIEW returns preview responses', () =>
      summary('?status=preview').expect(200).expect((r) => expect(r.body.totalCount).toBe(1)));

    it('filters by surveyor (wins over status)', () =>
      summary(`?surveyor=${SVR}`).expect(200).expect((r) => expect(r.body.totalCount).toBe(3)));
  });

  describe('GET summary — canExportFiles', () => {
    it('is false without confirm_files_export (no design lookup)', async () => {
      await summary().expect(200).expect((r) => expect(r.body.canExportFiles).toBe(false));
      expect(files.getText).not.toHaveBeenCalled();
    });

    it('is true when confirmed and the schema has a file-returning field', async () => {
      files.getText.mockResolvedValueOnce(
        JSON.stringify({
          schema: [
            { componentCode: 'Q1', columnName: 'value', dataType: 'string' },
            { componentCode: 'Q2', columnName: 'value', dataType: 'file' },
          ],
        }),
      );
      await summary('?confirm_files_export=true')
        .expect(200)
        .expect((r) => expect(r.body.canExportFiles).toBe(true));
    });

    it('is false when confirmed but no field returns a file', async () => {
      files.getText.mockResolvedValueOnce(
        JSON.stringify({
          schema: [{ componentCode: 'Q1', columnName: 'value', dataType: 'string' }],
        }),
      );
      await summary('?confirm_files_export=true')
        .expect(200)
        .expect((r) => expect(r.body.canExportFiles).toBe(false));
    });
  });

  describe('GET summary — shape + pagination', () => {
    it('maps surveyor name, dates and the disqualified flag', async () => {
      const res = await summary('?status=complete').expect(200);
      const disq = res.body.responses.find((x: { id: string }) => x.id === R_DISQ);
      expect(disq).toMatchObject({
        surveyor: SVR,
        firstName: 'Sam',
        lastName: 'Surveyor',
        disqualified: true,
        preview: false,
        lang: 'en',
      });
      expect(disq.startDate).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(disq.submitDate).toBe('2024-02-01 10:00:00');
      expect(typeof disq.index).toBe('number');
    });

    it('paginates', () =>
      summary('?per_page=2&page=1').expect(200).expect((r) => {
        expect(r.body.responses).toHaveLength(2);
        expect(r.body.totalPages).toBe(2);
        expect(r.body.totalCount).toBe(4);
        expect(r.body.pageNumber).toBe(1);
      }));
  });

  describe('DELETE response', () => {
    it('deletes a response (and cleans up its files), then it is gone', async () => {
      await request(server())
        .delete(`/survey/${SURVEY}/response/${R_INCOMPLETE}`)
        .set('Authorization', SUPER)
        .expect(204);
      expect(files.responseFiles).toHaveBeenCalledWith(SURVEY, R_INCOMPLETE);
      await summary().expect(200).expect((r) => expect(r.body.totalCount).toBe(3));
    });

    it('400 on deleting a missing response', () =>
      request(server())
        .delete(`/survey/${SURVEY}/response/20000000-0000-0000-0000-0000000000ff`)
        .set('Authorization', SUPER)
        .expect(400));
  });

  describe('authorization', () => {
    it('analyst may read the summary', () =>
      request(server())
        .get(`/survey/${SURVEY}/response/summary`)
        .set('Authorization', ANALYST)
        .expect(200));

    it('surveyor role is forbidden from the summary (403)', () =>
      request(server())
        .get(`/survey/${SURVEY}/response/summary`)
        .set('Authorization', SURVEYOR_ROLE)
        .expect(403));

    it('analyst may not delete (403)', () =>
      request(server())
        .delete(`/survey/${SURVEY}/response/${R_COMPLETE}`)
        .set('Authorization', ANALYST)
        .expect(403));

    it('unauthenticated is rejected (401)', () =>
      request(server()).get(`/survey/${SURVEY}/response/summary`).expect(401));
  });
});
