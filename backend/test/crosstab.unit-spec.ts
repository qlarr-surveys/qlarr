import { BadRequestException } from '@nestjs/common';
import {
  buildFilterSql,
  buildVarDefs,
  computeCrosstab,
  CrosstabRecord,
  resolveRows,
  npsBucket,
  VarDef,
  zTest,
} from '../src/modules/responses/crosstab.service';

const opts = { counts: true, pct: true, significance: true };

/** Build N records with a fixed (col, single-row) pair. */
const rep = (n: number, col: string, row: string | null): CrosstabRecord[] =>
  Array.from({ length: n }, () => ({
    col,
    rows: row == null ? [] : [row],
    weight: null,
  }));

describe('computeCrosstab — single-choice rows', () => {
  it('counts cells and computes column percentages against the answered base', () => {
    const records = [
      ...rep(30, 'A', 'yes'),
      ...rep(10, 'A', 'no'),
      ...rep(20, 'B', 'yes'),
      ...rep(20, 'B', 'no'),
    ];
    const res = computeCrosstab({
      records,
      rowCodes: ['yes', 'no'],
      colCodes: ['A', 'B'],
      multi: false,
      options: opts,
    });

    const [colA, colB] = res.columns;
    expect(colA.base).toBe(40);
    expect(colB.base).toBe(40);
    // unweighted → effective base equals base
    expect(colA.effectiveBase).toBe(40);
    expect(colA.lowBase).toBe(false);

    const yes = res.rows.find((r) => r.code === 'yes')!;
    expect(yes.cells[0]).toMatchObject({ count: 30, pct: 0.75 });
    expect(yes.cells[1]).toMatchObject({ count: 20, pct: 0.5 });
  });

  it('counts respondents who answered the column but not the row as notAnswered', () => {
    const records = [...rep(30, 'A', 'yes'), ...rep(5, 'A', null)];
    const res = computeCrosstab({
      records,
      rowCodes: ['yes', 'no'],
      colCodes: ['A'],
      multi: false,
      options: opts,
    });
    expect(res.notAnswered).toBe(5);
    expect(res.columns[0].base).toBe(30); // the 5 unanswered are excluded from base
  });
});

describe('computeCrosstab — low base suppression', () => {
  it('flags columns under 30 as lowBase and warns', () => {
    const records = [...rep(40, 'A', 'yes'), ...rep(10, 'B', 'yes')];
    const res = computeCrosstab({
      records,
      rowCodes: ['yes'],
      colCodes: ['A', 'B'],
      multi: false,
      options: opts,
    });
    expect(res.columns[0].lowBase).toBe(false);
    expect(res.columns[1].lowBase).toBe(true);
    expect(res.warnings).toContainEqual({
      code: 'lowBase',
      params: { count: 1, total: 2 },
    });
    // no significance letters may reference a low-base column
    const yes = res.rows[0];
    expect(yes.cells[0].beats).toEqual([]);
    expect(yes.cells[1].beats).toEqual([]);
  });

  it('warns about thin columns between 30 and 100', () => {
    const records = [...rep(50, 'A', 'yes'), ...rep(50, 'B', 'yes')];
    const res = computeCrosstab({
      records,
      rowCodes: ['yes'],
      colCodes: ['A', 'B'],
      multi: false,
      options: opts,
    });
    expect(res.warnings).toContainEqual({
      code: 'thinColumns',
      params: { count: 2 },
    });
  });
});

describe('computeCrosstab — significance letters', () => {
  it('marks the column a cell is significantly higher than', () => {
    // A: 90/100 yes; B: 40/100 yes → A ≫ B at 95%.
    const records = [
      ...rep(90, 'A', 'yes'),
      ...rep(10, 'A', 'no'),
      ...rep(40, 'B', 'yes'),
      ...rep(60, 'B', 'no'),
    ];
    const res = computeCrosstab({
      records,
      rowCodes: ['yes', 'no'],
      colCodes: ['A', 'B'],
      multi: false,
      options: opts,
    });
    const yes = res.rows.find((r) => r.code === 'yes')!;
    expect(yes.cells[0].beats).toEqual(['B']); // A beats B
    expect(yes.cells[1].beats).toEqual([]); // B beats nobody
  });

  it('is omitted when the significance option is off', () => {
    const records = [
      ...rep(90, 'A', 'yes'),
      ...rep(10, 'A', 'no'),
      ...rep(40, 'B', 'yes'),
      ...rep(60, 'B', 'no'),
    ];
    const res = computeCrosstab({
      records,
      rowCodes: ['yes', 'no'],
      colCodes: ['A', 'B'],
      multi: false,
      options: { counts: true, pct: true, significance: false },
    });
    expect(res.rows[0].cells[0].beats).toEqual([]);
  });
});

describe('computeCrosstab — MCQ multi-membership rows', () => {
  it('lets a respondent count in several rows so column %s can exceed 100', () => {
    // 40 respondents in column A, each selected BOTH options.
    const records: CrosstabRecord[] = Array.from({ length: 40 }, () => ({
      col: 'A',
      rows: ['opt1', 'opt2'],
      weight: null,
    }));
    const res = computeCrosstab({
      records,
      rowCodes: ['opt1', 'opt2'],
      colCodes: ['A'],
      multi: true,
      options: opts,
    });
    expect(res.multi).toBe(true);
    expect(res.columns[0].base).toBe(40); // still 40 respondents, not 80
    const opt1 = res.rows.find((r) => r.code === 'opt1')!;
    const opt2 = res.rows.find((r) => r.code === 'opt2')!;
    expect(opt1.cells[0]).toMatchObject({ count: 40, pct: 1 });
    expect(opt2.cells[0]).toMatchObject({ count: 40, pct: 1 });
    // → the two rows sum to 200%, the hallmark of a multi row.
  });

  it('dedupes a repeated selection so it is not double-counted', () => {
    const records: CrosstabRecord[] = [
      { col: 'A', rows: ['opt1', 'opt1'], weight: null },
    ];
    const res = computeCrosstab({
      records,
      rowCodes: ['opt1'],
      colCodes: ['A'],
      multi: true,
      options: opts,
    });
    expect(res.columns[0].base).toBe(1);
    expect(res.rows[0].cells[0].count).toBe(1);
  });
});

describe('computeCrosstab — weighting', () => {
  it('post-stratifies to targets and reports effective base / efficiency', () => {
    // Weight variable is company size: sample 90 small / 10 large, target 50/50.
    // The banner is region, and each region mixes small & large respondents, so
    // the within-column weight variance drives efficiency below 100%.
    const mk = (col: string, weight: string) => ({ col, rows: ['yes'], weight });
    const records: CrosstabRecord[] = [
      ...Array.from({ length: 45 }, () => mk('north', 'small')),
      ...Array.from({ length: 5 }, () => mk('north', 'large')),
      ...Array.from({ length: 45 }, () => mk('south', 'small')),
      ...Array.from({ length: 5 }, () => mk('south', 'large')),
    ];
    const res = computeCrosstab({
      records,
      rowCodes: ['yes'],
      colCodes: ['north', 'south'],
      multi: false,
      weightCodes: ['small', 'large'],
      targets: { small: 50, large: 50 },
      options: opts,
    });
    expect(res.weighting).toBeDefined();
    // small weight = 0.5/0.9 ≈ 0.556, large weight = 0.5/0.1 = 5
    expect(res.weighting!.maxWeight).toBeCloseTo(5, 2);
    // weighted base ≈ 90*0.556 + 10*5 = 100
    expect(res.weighting!.weightedBase).toBe(100);
    // per-category observed distribution surfaced for the UI reference:
    // 90 small (90% of the sample) and 10 large (10%), plus the applied weights.
    const small = res.weighting!.categories.find((c) => c.code === 'small')!;
    const large = res.weighting!.categories.find((c) => c.code === 'large')!;
    expect(small).toMatchObject({ count: 90, share: 0.9 });
    expect(large).toMatchObject({ count: 10, share: 0.1, weight: 5 });
    // mixing heavily-weighted large respondents into each column → efficiency < 100%
    expect(res.weighting!.efficiency).toBeGreaterThan(0);
    expect(res.weighting!.efficiency).toBeLessThan(0.8);
    expect(res.warnings.some((w) => w.code === 'lowEfficiency')).toBe(true);
  });

  it('warns when targets do not sum to 100', () => {
    const records: CrosstabRecord[] = Array.from({ length: 60 }, (_, i) => ({
      col: i % 2 ? 'a' : 'b',
      rows: ['yes'],
      weight: i % 2 ? 'a' : 'b',
    }));
    const res = computeCrosstab({
      records,
      rowCodes: ['yes'],
      colCodes: ['a', 'b'],
      multi: false,
      weightCodes: ['a', 'b'],
      targets: { a: 40, b: 40 }, // sums to 80
      options: opts,
    });
    expect(res.warnings.some((w) => w.code === 'targetSum')).toBe(true);
  });

  it('excludes respondents with no weight answer and reports/warns the count', () => {
    const mk = (col: string, weight: string | null) => ({
      col,
      rows: ['yes'],
      weight,
    });
    const records: CrosstabRecord[] = [
      ...Array.from({ length: 50 }, () => mk('north', 'small')),
      ...Array.from({ length: 50 }, () => mk('south', 'small')),
      // in a valid column, but never answered the weight question:
      ...Array.from({ length: 10 }, () => mk('north', null)),
    ];
    const res = computeCrosstab({
      records,
      rowCodes: ['yes'],
      colCodes: ['north', 'south'],
      multi: false,
      weightCodes: ['small'],
      targets: { small: 100 },
      options: opts,
    });
    expect(res.weighting!.droppedNoWeight).toBe(10);
    expect(res.columns[0].base).toBe(50); // the 10 unweighted north rows dropped
    expect(res.warnings).toContainEqual({
      code: 'droppedWeight',
      params: { count: 10 },
    });
  });

  // Full sample: 90 small / 10 large, target 50/50 → small ≈ 0.556, large = 5.
  const fullSample = { small: 90, large: 10 };
  const weightInput = (records: CrosstabRecord[]) => ({
    records,
    rowCodes: ['yes'],
    colCodes: ['north', 'south'],
    multi: false,
    weightCodes: ['small', 'large'],
    targets: { small: 50, large: 50 },
    weightBaseCounts: fullSample,
    options: opts,
  });

  it('keeps full-sample weights when records hold one weight category (filter on the weight var)', () => {
    const mk = (col: string) => ({ col, rows: ['yes'], weight: 'large' });
    const records: CrosstabRecord[] = [
      ...Array.from({ length: 6 }, () => mk('north')),
      ...Array.from({ length: 4 }, () => mk('south')),
    ];
    const res = computeCrosstab(weightInput(records));
    // each large respondent keeps weight 5 → weighted base 10*5, not scaled down
    expect(res.weighting!.weightedBase).toBe(50);
    expect(res.columns.map((c) => c.base)).toEqual([30, 20]);
    expect(res.weighting!.maxWeight).toBe(5);
    expect(res.weighting!.droppedNoWeight).toBe(0);
    // the summary reports the full-sample distribution the weights came from
    const large = res.weighting!.categories.find((c) => c.code === 'large')!;
    expect(large).toMatchObject({ count: 10, share: 0.1, weight: 5 });
  });

  it('keeps full-sample weights for a subgroup filtered on another variable', () => {
    // subgroup is 50/50 small/large; recomputing from it would give weight 1 each
    const mk = (weight: string) => ({ col: 'north', rows: ['yes'], weight });
    const records: CrosstabRecord[] = [
      ...Array.from({ length: 10 }, () => mk('small')),
      ...Array.from({ length: 10 }, () => mk('large')),
    ];
    const res = computeCrosstab(weightInput(records));
    const weights = Object.fromEntries(
      res.weighting!.categories.map((c) => [c.code, c.weight]),
    );
    expect(weights).toEqual({ small: 0.56, large: 5 });
    // 10*0.556 + 10*5 ≈ 56
    expect(res.weighting!.weightedBase).toBe(56);
  });

  it('reports maxWeight only over weight categories present in the table', () => {
    const records: CrosstabRecord[] = Array.from({ length: 10 }, () => ({
      col: 'north',
      rows: ['yes'],
      weight: 'small',
    }));
    const res = computeCrosstab(weightInput(records));
    expect(res.weighting!.maxWeight).toBeCloseTo(0.56, 2);
    expect(res.warnings.some((w) => w.code === 'highWeight')).toBe(false);
  });
});

describe('zTest', () => {
  it('returns 0 when either base is under 30', () => {
    expect(zTest(0.9, 20, 0.4, 100)).toBe(0);
  });
  it('is positive when the first proportion is clearly higher', () => {
    expect(zTest(0.9, 100, 0.4, 100)).toBeGreaterThan(1.96);
  });
});

describe('resolveRows — row kinds', () => {
  const def = (over: Partial<VarDef>): VarDef => ({
    id: 'Q',
    label: 'Q',
    kind: 'single',
    multi: false,
    categories: [],
    valueKey: 'Q.value',
    ...over,
  });

  it('single-choice → the one chosen code', () => {
    expect(resolveRows(def({}), { 'Q.value': 'A1' })).toEqual(['A1']);
    expect(resolveRows(def({}), {})).toEqual([]);
  });

  it('multi-choice → every selected code, empty when not an array', () => {
    const d = def({ kind: 'multi', multi: true });
    expect(resolveRows(d, { 'Q.value': ['A1', 'A2'] })).toEqual(['A1', 'A2']);
    expect(resolveRows(d, { 'Q.value': 'A1' })).toEqual([]);
  });

  it('multi keeps string elements only, like the SQL filter', () => {
    const d = def({ kind: 'multi', multi: true });
    expect(resolveRows(d, { 'Q.value': ['A1', 1, null, true] })).toEqual(['A1']);
  });

  it('NPS → the derived bucket', () => {
    const d = def({ kind: 'nps' });
    expect(resolveRows(d, { 'Q.value': 3 })).toEqual(['detractors']);
    expect(resolveRows(d, { 'Q.value': 8 })).toEqual(['passives']);
    expect(resolveRows(d, { 'Q.value': 10 })).toEqual(['promoters']);
    expect(resolveRows(d, { 'Q.value': '9' })).toEqual(['promoters']); // string coercion
  });

  it('NPS reads plain decimal strings only, like the SQL filter', () => {
    const d = def({ kind: 'nps' });
    expect(resolveRows(d, { 'Q.value': ' 7.5 ' })).toEqual(['passives']);
    for (const v of ['+5', '.5', '1e1', '0x9', '']) {
      expect(resolveRows(d, { 'Q.value': v })).toEqual([]);
    }
  });

  it('matrix sub-row → the stored column value via its own valueKey', () => {
    const d = def({ id: 'QA1', kind: 'single', valueKey: 'QA1.value' });
    expect(resolveRows(d, { 'QA1.value': 'B2' })).toEqual(['B2']);
  });
});

describe('npsBucket boundaries', () => {
  it('splits 0–6 / 7–8 / 9–10', () => {
    expect(npsBucket(0)).toBe('detractors');
    expect(npsBucket(6)).toBe('detractors');
    expect(npsBucket(7)).toBe('passives');
    expect(npsBucket(8)).toBe('passives');
    expect(npsBucket(9)).toBe('promoters');
    expect(npsBucket(10)).toBe('promoters');
  });
});

describe('buildVarDefs — design → crossable variables', () => {
  // A processed-design stand-in with one of each relevant question shape.
  // engine.isQuestionCode gates on the `Q` prefix, so `G1` (a group) is skipped.
  const engine = { isQuestionCode: (c: string) => c.startsWith('Q') } as any;
  const ctx = {
    componentIndexList: [
      { code: 'G1' }, // not a question → ignored
      { code: 'Q1', children: ['Q1A1', 'Q1A2'] }, // SCQ
      { code: 'Q2', children: ['Q2A1', 'Q2A2', 'Q2A3'] }, // MCQ
      { code: 'Q3', children: [] }, // NPS
      { code: 'Q4', children: ['Q4R1', 'Q4R2', 'Q4C1', 'Q4C2'] }, // SCQ_ARRAY
      { code: 'Q5', children: ['Q5A1'] }, // SCQ with only one option → dropped
    ],
    questionTypes: {
      Q1: 'SCQ',
      Q2: 'MCQ',
      Q3: 'NPS',
      Q4: 'SCQ_ARRAY',
      Q5: 'SCQ',
    },
    answerTypes: {
      Q4R1: 'ROW',
      Q4R2: 'ROW',
      Q4C1: 'COLUMN',
      Q4C2: 'COLUMN',
    },
    schemaMap: {
      Q1: { componentCode: 'Q1', columnName: 'VALUE' },
      Q2: { componentCode: 'Q2', columnName: 'VALUE' },
      Q3: { componentCode: 'Q3', columnName: 'VALUE' },
      Q4R1: { componentCode: 'Q4R1', columnName: 'VALUE' },
      Q4R2: { componentCode: 'Q4R2', columnName: 'VALUE' },
      Q5: { componentCode: 'Q5', columnName: 'VALUE' },
    },
    labels: {
      Q1: 'Gender',
      Q1A1: 'Male',
      Q1A2: 'Female',
      Q2: 'Brands',
      Q3: 'Recommend',
      Q4: 'Satisfaction',
      Q4R1: 'Support',
      Q4R2: 'Pricing',
      Q4C1: 'Poor',
      Q4C2: 'Good',
    },
  } as any;

  const { rowDefs, colDefs } = buildVarDefs(ctx, engine);

  it('offers only single-choice questions as columns (the banner)', () => {
    expect([...colDefs.keys()]).toEqual(['Q1']);
    expect(colDefs.get('Q1')).toMatchObject({ kind: 'single', multi: false });
  });

  it('offers single, multi, NPS and matrix sub-rows as rows', () => {
    expect([...rowDefs.keys()].sort()).toEqual([
      'Q1',
      'Q2',
      'Q3',
      'Q4R1',
      'Q4R2',
    ]);
  });

  it('resolves each row kind with its value key and categories', () => {
    expect(rowDefs.get('Q1')).toMatchObject({
      kind: 'single',
      multi: false,
      valueKey: 'Q1.value',
    });
    expect(rowDefs.get('Q1')!.categories.map((c) => c.code)).toEqual([
      'A1',
      'A2',
    ]);
    expect(rowDefs.get('Q2')).toMatchObject({ kind: 'multi', multi: true });
    expect(rowDefs.get('Q3')!.kind).toBe('nps');
    expect(rowDefs.get('Q3')!.categories.map((c) => c.code)).toEqual([
      'detractors',
      'passives',
      'promoters',
    ]);
  });

  it('expands a matrix into one single-choice row per sub-row, sharing the columns', () => {
    const support = rowDefs.get('Q4R1')!;
    expect(support).toMatchObject({
      kind: 'single',
      multi: false,
      label: 'Satisfaction – Support',
      valueKey: 'Q4R1.value',
    });
    // categories are the matrix COLUMN answers, shared across sub-rows
    expect(support.categories.map((c) => c.code)).toEqual(['C1', 'C2']);
    expect(rowDefs.get('Q4R2')!.categories.map((c) => c.code)).toEqual([
      'C1',
      'C2',
    ]);
  });

  it('drops choice questions with fewer than two options', () => {
    expect(rowDefs.has('Q5')).toBe(false);
    expect(colDefs.has('Q5')).toBe(false);
  });
});

describe('buildFilterSql — answer filters → WHERE fragment', () => {
  const def = (id: string, kind: VarDef['kind'], codes: string[]): VarDef => ({
    id,
    label: id,
    kind,
    multi: kind === 'multi',
    categories: codes.map((code) => ({ code, label: code })),
    valueKey: `${id}.value`,
  });
  const defs = new Map<string, VarDef>([
    ['Q1', def('Q1', 'single', ['A1', 'A2', 'A3'])],
    ['Q2', def('Q2', 'multi', ['A1', 'A2'])],
    ['Q3', def('Q3', 'nps', ['detractors', 'passives', 'promoters'])],
  ]);

  it('is empty when there are no filters', () => {
    expect(buildFilterSql(undefined, defs, 3)).toEqual({ clause: '', params: [] });
    expect(buildFilterSql([], defs, 3)).toEqual({ clause: '', params: [] });
  });

  it('ANDs filters and numbers placeholders from firstParam', () => {
    const { clause, params } = buildFilterSql(
      [
        { var: 'Q1', codes: ['A1', 'A2'] },
        { var: 'Q2', codes: ['A2'] },
      ],
      defs,
      3,
    );
    expect(params).toEqual(['Q1.value', ['A1', 'A2'], 'Q2.value', ['A2']]);
    expect(clause).toBe(
      ` AND ("values" ->> $3 = ANY($4::text[]))` +
        ` AND (jsonb_typeof("values" -> $5) = 'array' AND "values" -> $5 ?| $6::text[])`,
    );
  });

  it('ORs NPS buckets as numeric ranges', () => {
    const { clause, params } = buildFilterSql(
      [{ var: 'Q3', codes: ['detractors', 'promoters'] }],
      defs,
      2,
    );
    expect(params).toEqual(['Q3.value']);
    expect(clause).toContain(' <= 6 OR ');
    expect(clause).toContain(' > 8');
    expect(clause).not.toContain('$3');
  });

  it('dedupes repeated codes', () => {
    const { params } = buildFilterSql([{ var: 'Q1', codes: ['A1', 'A1'] }], defs, 2);
    expect(params).toEqual(['Q1.value', ['A1']]);
  });

  it('rejects unknown variables, unknown codes and empty code lists', () => {
    expect(() => buildFilterSql([{ var: 'Q9', codes: ['A1'] }], defs, 2)).toThrow(
      BadRequestException,
    );
    expect(() => buildFilterSql([{ var: 'Q1', codes: ['A9'] }], defs, 2)).toThrow(
      BadRequestException,
    );
    expect(() => buildFilterSql([{ var: 'Q1', codes: [] }], defs, 2)).toThrow(
      BadRequestException,
    );
  });
});
