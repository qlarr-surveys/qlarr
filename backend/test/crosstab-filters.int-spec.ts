import { DataSource } from 'typeorm';
import { buildFilterSql, countWeightBase, VarDef } from '../src/modules/responses/crosstab.service';
import { CrosstabFilter } from '../src/modules/responses/crosstab.dto';
import { startTestApp, TestApp } from './harness';

const SURVEY = '50000000-0000-0000-0000-000000000001';

const def = (id: string, kind: VarDef['kind'], codes: string[]): VarDef => ({
  id,
  label: id,
  kind,
  multi: kind === 'multi',
  categories: codes.map((code) => ({ code, label: code })),
  valueKey: `${id}.value`,
});
const DEFS = new Map<string, VarDef>([
  ['Q1', def('Q1', 'single', ['A1', 'A2', 'A3'])],
  ['Q2', def('Q2', 'multi', ['A1', 'A2', 'A3'])],
  ['Q3', def('Q3', 'nps', ['detractors', 'passives', 'promoters'])],
]);

describe('Crosstab answer filters (SQL)', () => {
  let ctx: TestApp;
  let root: DataSource;
  let next = 0;

  const addResponse = async (name: string, values: object): Promise<void> => {
    next += 1;
    const id = `60000000-0000-0000-0000-${String(next).padStart(12, '0')}`;
    await root.query(
      `INSERT INTO responses
         (id, version, survey_id, preview, nav_index, start_date, submit_date, lang, events, "values")
       VALUES ($1,1,$2,false,'','2024-01-01 00:00:00','2024-01-02 00:00:00','en','[]'::jsonb,$3::jsonb)`,
      [id, SURVEY, JSON.stringify({ name, ...values })],
    );
  };

  /** Names of the responses matching `filters`, via the same fragment tabulate uses. */
  const matching = async (filters: CrosstabFilter[]): Promise<string[]> => {
    const filter = buildFilterSql(filters, DEFS, 2);
    const rows: Array<{ name: string }> = await root.query(
      `SELECT "values" ->> 'name' AS name FROM responses
       WHERE survey_id = $1${filter.clause} ORDER BY name`,
      [SURVEY, ...filter.params],
    );
    return rows.map((r) => r.name);
  };

  beforeAll(async () => {
    ctx = await startTestApp();
    root = ctx.root;
    await root.query(
      `INSERT INTO surveys
         (id, can_lock_survey, name, quota, status, usage, creation_date, last_modified,
          record_gps, save_ip, save_timings, background_audio)
       VALUES ($1,true,'filters',-1,'ACTIVE','MIXED','2024-01-01 00:00:00','2024-01-01 00:00:00',
               true,true,true,true)`,
      [SURVEY],
    );
    await root.query(
      `INSERT INTO versions (version, sub_version, survey_id, last_modified, schema, valid, published)
       VALUES (1,1,$1,'2024-01-01 00:00:00','[]',true,true)`,
      [SURVEY],
    );
    await addResponse('a', { 'Q1.value': 'A1', 'Q2.value': ['A1', 'A2'], 'Q3.value': 3 });
    await addResponse('b', { 'Q1.value': 'A2', 'Q2.value': ['A3'], 'Q3.value': 7 });
    await addResponse('c', { 'Q1.value': 'A3', 'Q2.value': [], 'Q3.value': '10' });
    await addResponse('d', { 'Q2.value': 'A1', 'Q3.value': 'abc' });
    await addResponse('e', { 'Q1.value': ['A1'], 'Q3.value': 8.5 });
    await addResponse('f', { 'Q1.value': '  ' });
    await addResponse('g', { 'Q1.value': { code: 'A1' } });
    await addResponse('h', { 'Q1.value': null });
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('matches single-choice answers by code, ignoring array values', async () => {
    expect(await matching([{ var: 'Q1', codes: ['A1', 'A2'] }])).toEqual(['a', 'b']);
  });

  it('matches multi-choice answers containing any code, arrays only', async () => {
    expect(await matching([{ var: 'Q2', codes: ['A1'] }])).toEqual(['a']);
    expect(await matching([{ var: 'Q2', codes: ['A2', 'A3'] }])).toEqual(['a', 'b']);
  });

  it('buckets NPS numbers and numeric strings, skipping non-numbers', async () => {
    expect(await matching([{ var: 'Q3', codes: ['detractors'] }])).toEqual(['a']);
    expect(await matching([{ var: 'Q3', codes: ['passives'] }])).toEqual(['b']);
    expect(await matching([{ var: 'Q3', codes: ['promoters'] }])).toEqual(['c', 'e']);
  });

  it('ANDs filters together', async () => {
    expect(
      await matching([
        { var: 'Q1', codes: ['A1', 'A2', 'A3'] },
        { var: 'Q3', codes: ['passives', 'promoters'] },
      ]),
    ).toEqual(['b', 'c']);
  });

  it('counts the weight base per answer, reading answers like resolveSingle', async () => {
    // arrays (e), blank strings (f), objects (g), nulls (h) and missing keys (d)
    // are unanswered; filters don't apply to the weight base.
    expect(await countWeightBase(root, SURVEY, 'Q1.value')).toEqual({
      A1: 1,
      A2: 1,
      A3: 1,
    });
  });
});
