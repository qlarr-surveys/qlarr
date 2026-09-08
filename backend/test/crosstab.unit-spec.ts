import {
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

  it('NPS → the derived bucket', () => {
    const d = def({ kind: 'nps' });
    expect(resolveRows(d, { 'Q.value': 3 })).toEqual(['detractors']);
    expect(resolveRows(d, { 'Q.value': 8 })).toEqual(['passives']);
    expect(resolveRows(d, { 'Q.value': 10 })).toEqual(['promoters']);
    expect(resolveRows(d, { 'Q.value': '9' })).toEqual(['promoters']); // string coercion
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
