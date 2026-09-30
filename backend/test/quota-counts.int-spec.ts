import { DataSource } from 'typeorm';
import { ValidationJsonOutput } from '../src/engine/engine.types';
import { QuotaService } from '../src/modules/design/quota.service';
import { SurveyEntity } from '../src/modules/surveys/survey.entity';
import { startTestApp, TestApp } from './harness';

const SURVEY = '30000000-0000-0000-0000-000000000001';
const OTHER_SURVEY = '30000000-0000-0000-0000-000000000002';

describe('Quota counts (responses.quota_codes)', () => {
  let ctx: TestApp;
  let root: DataSource;
  let quotas: QuotaService;
  let next = 0;

  const addResponse = async (
    values: object | null,
    opts: { preview?: boolean; complete?: boolean; surveyId?: string } = {},
  ): Promise<string> => {
    next += 1;
    const id = `40000000-0000-0000-0000-${String(next).padStart(12, '0')}`;
    await root.query(
      `INSERT INTO responses
         (id, version, survey_id, preview, nav_index, start_date, submit_date, lang, events, "values")
       VALUES ($1,1,$2,$3,'','2024-01-01 00:00:00',$4,'en','[]'::jsonb,$5::jsonb)`,
      [
        id,
        opts.surveyId ?? SURVEY,
        opts.preview ?? false,
        opts.complete === false ? null : '2024-01-02 00:00:00',
        values === null ? null : JSON.stringify(values),
      ],
    );
    return id;
  };

  const quotaCodes = async (id: string): Promise<string[]> =>
    (await root.query(`SELECT quota_codes FROM responses WHERE id = $1`, [id]))[0].quota_codes;

  beforeAll(async () => {
    ctx = await startTestApp();
    root = ctx.root;
    quotas = ctx.app.get(QuotaService);
    for (const id of [SURVEY, OTHER_SURVEY]) {
      await root.query(
        `INSERT INTO surveys
           (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
            record_gps, save_ip, save_timings, background_audio)
         VALUES ($1,true,$2,-1,'ACTIVE','MIXED','2024-01-01 00:00:00','2024-01-01 00:00:00',
                 true,true,true,true)`,
        [id, `survey ${id}`],
      );
      await root.query(
        `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
         VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,true)`,
        [id],
      );
    }
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('records the quotas a response is a member of', async () => {
    const both = await addResponse({
      'Q1.value': 'x',
      'Survey.quota_QTb': true,
      'Survey.quota_QTa': 'true',
      'Survey.quota_QTc': false,
    });
    expect(await quotaCodes(both)).toEqual(['QTa', 'QTb']);

    for (const value of [false, 'false', 1, null, 'TRUE', { nested: true }]) {
      expect(await quotaCodes(await addResponse({ 'Survey.quota_QTa': value }))).toEqual([]);
    }
    expect(await quotaCodes(await addResponse({ 'Q1.value': 'x' }))).toEqual([]);
    expect(await quotaCodes(await addResponse(null))).toEqual([]);
  });

  it('records none for a disqualified response', async () => {
    for (const disqualified of [true, 'true']) {
      const id = await addResponse({
        'Survey.quota_QTa': true,
        'Survey.disqualified': disqualified,
      });
      expect(await quotaCodes(id)).toEqual([]);
    }
    const kept = await addResponse({ 'Survey.quota_QTa': true, 'Survey.disqualified': false });
    expect(await quotaCodes(kept)).toEqual(['QTa']);
  });

  it('follows the response as its values change', async () => {
    const id = await addResponse({ 'Survey.quota_QTa': false });
    await root.query(`UPDATE responses SET "values" = $2::jsonb WHERE id = $1`, [
      id,
      JSON.stringify({ 'Survey.quota_QTa': true }),
    ]);
    expect(await quotaCodes(id)).toEqual(['QTa']);
    await root.query(
      `UPDATE responses SET "values" = "values" || '{"Survey.disqualified": true}' WHERE id = $1`,
      [id],
    );
    expect(await quotaCodes(id)).toEqual([]);
  });

  it('counts only complete, non-preview members of the requested quotas', async () => {
    await root.query(`DELETE FROM responses`);
    const member = { 'Survey.quota_QTa': true, 'Survey.quota_QTb': true };
    await addResponse(member);
    await addResponse(member);
    await addResponse({ 'Survey.quota_QTa': true });
    await addResponse(member, { preview: true });
    await addResponse(member, { complete: false });
    await addResponse({ ...member, 'Survey.disqualified': true });
    await addResponse(member, { surveyId: OTHER_SURVEY });

    expect(await quotas.counts(SURVEY, ['QTa', 'QTb', 'QTnone'])).toEqual({ QTa: 3, QTb: 2 });
    expect(await quotas.counts(SURVEY, ['QTb'])).toEqual({ QTb: 2 });
    expect(await quotas.counts(SURVEY, [])).toEqual({});
  });

  it('reports the draft quotas, full by the published limits', async () => {
    // Counts from the previous test: QTa 3, QTb 2.
    const design = (quotaList: object[]) =>
      ({ survey: { quotas: quotaList } }) as unknown as ValidationJsonOutput;
    const survey = { id: SURVEY } as SurveyEntity;
    const draft = design([
      { code: 'QTa', label: 'A', limit: 10 },
      { code: 'QTb', label: 'B', limit: 2 },
      { code: 'QTnew', label: 'New', limit: 1 },
    ]);
    const published = design([
      { code: 'QTa', label: 'A', limit: 3 },
      { code: 'QTb', label: 'B', limit: 5 },
    ]);

    expect((await quotas.status(survey, draft, published)).quotas).toEqual([
      { code: 'QTa', label: 'A', limit: 10, count: 3, full: true },
      { code: 'QTb', label: 'B', limit: 2, count: 2, full: false },
      { code: 'QTnew', label: 'New', limit: 1, count: 0, full: false },
    ]);
    expect(
      (await quotas.status(survey, draft, null)).quotas.map((quota) => quota.full),
    ).toEqual([false, false, false]);
  });
});
