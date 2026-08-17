import { EngineService } from '../src/engine/engine.service';

/**
 * Exercises the survey-engine binding end to end against the published
 * `@qlarr/survey-engine` KMP build. Because that JS is the same code the JVM
 * runs, a stable, correctly-structured output here IS the parity check.
 */
describe('EngineService (survey-engine binding)', () => {
  const engine = new EngineService();

  it('creates a blank survey design', () => {
    const design = JSON.parse(engine.newSurvey('Customer Feedback'));
    expect(design.code).toBe('Survey');
    expect(Array.isArray(design.groups)).toBe(true);
  });

  it('validates a design into the full ValidationJsonOutput shape', async () => {
    const out = await engine.validate(engine.newSurvey('Customer Feedback'));
    expect(Object.keys(out).sort()).toEqual(
      ['componentIndexList', 'impactMap', 'replacements', 'schema', 'script', 'skipMap', 'survey'].sort(),
    );
    expect(typeof out.script).toBe('string');
    expect(out.script.length).toBeGreaterThan(0);
    // The flattened index always starts with the Survey component.
    expect(out.componentIndexList[0].code).toBe('Survey');
  });

  it('is deterministic (same design → identical validation output)', async () => {
    const design = engine.newSurvey('Repeatable');
    expect(await engine.validate(design)).toEqual(await engine.validate(design));
  });

  it('process() merges designer state and re-validates', async () => {
    const design = JSON.parse(engine.newSurvey('Feedback'));
    const out = await engine.process({}, design);
    expect(out.componentIndexList[0].code).toBe('Survey');
    expect(typeof out.script).toBe('string');
  });

  it('navigates a validated survey (Start) and advances forward on NEXT', async () => {
    const processedSurvey = JSON.stringify(await engine.validate(engine.newSurvey('Nav')));
    const start = await engine.navigate({
      values: '{}',
      processedSurvey,
      lang: null,
      navigationMode: 'GROUP_BY_GROUP',
      navigationIndex: null,
      navigationDirection: { name: 'START' },
      skipInvalid: false,
      surveyMode: 'ONLINE',
    });
    expect(start.navigationIndex.name).toBe('group');
    expect(start.toSave).toBeDefined();

    // NEXT must advance from the current index — resuming from the returned
    // index and driving forward. (Regression: an unrecognised direction name
    // silently collapses to Start, re-landing on the same index → "stuck on Next".)
    const next = await engine.navigate({
      values: JSON.stringify(start.toSave),
      processedSurvey,
      lang: null,
      navigationMode: 'GROUP_BY_GROUP',
      navigationIndex: start.navigationIndex,
      navigationDirection: { name: 'NEXT' },
      skipInvalid: false,
      surveyMode: 'ONLINE',
    });
    expect(next.navigationIndex.name).toBe('end');
  });

  it('maps the engine\'s uppercase direction names (NEXT ≠ Start)', async () => {
    // The frontend and the engine\'s own serializer use uppercase serial names
    // (START/PREV/NEXT/RESUME/JUMP). Sending NEXT from the first group must move
    // to the end, not re-run Start (which would return the same group index).
    const processedSurvey = JSON.stringify(await engine.validate(engine.newSurvey('Dir')));
    const start = await engine.navigate({
      values: '{}',
      processedSurvey,
      lang: null,
      navigationMode: 'GROUP_BY_GROUP',
      navigationIndex: null,
      navigationDirection: { name: 'START' },
      skipInvalid: false,
      surveyMode: 'ONLINE',
    });
    const restarted = await engine.navigate({
      values: JSON.stringify(start.toSave),
      processedSurvey,
      lang: null,
      navigationMode: 'GROUP_BY_GROUP',
      navigationIndex: start.navigationIndex,
      navigationDirection: { name: 'START' },
      skipInvalid: false,
      surveyMode: 'ONLINE',
    });
    const next = await engine.navigate({
      values: JSON.stringify(start.toSave),
      processedSurvey,
      lang: null,
      navigationMode: 'GROUP_BY_GROUP',
      navigationIndex: start.navigationIndex,
      navigationDirection: { name: 'NEXT' },
      skipInvalid: false,
      surveyMode: 'ONLINE',
    });
    expect(restarted.navigationIndex.name).toBe('group');
    expect(next.navigationIndex.name).toBe('end');
    expect(next.navigationIndex).not.toEqual(restarted.navigationIndex);
  });

  it('exposes the runtime + engine scripts', () => {
    expect(engine.commonScript().length).toBeGreaterThan(0);
    expect(engine.engineScript().length).toBeGreaterThan(0);
    // Stable across calls.
    expect(engine.commonScript()).toBe(engine.commonScript());
  });

  describe('maskedValues', () => {
    it('keeps only masked values that have a matching answer value', () => {
      expect(
        engine.maskedValues({
          'Q1.value': 1,
          'Q1.masked_value': 'one',
          'Q2.value': 2, // no masked_value → dropped
          'Q3.masked_value': 'orphan', // no .value → dropped
        }),
      ).toEqual({ 'Q1.masked_value': 'one' });
    });

    it('returns empty when there are no answer values', () => {
      expect(engine.maskedValues({ 'Survey.mode': 'online' })).toEqual({});
    });
  });

  describe('sortChildren', () => {
    // A DFS-flattened index: Survey → [G1 → [Q1, Q2], G2].
    const list = [
      { code: 'Survey', children: ['G1', 'G2'] },
      { code: 'G1', children: ['Q1', 'Q2'] },
      { code: 'Q1', children: [] },
      { code: 'Q2', children: [] },
      { code: 'G2', children: [] },
    ] as unknown as Parameters<EngineService['sortChildren']>[0];
    const codes = (l: { code: string }[]) => l.map((c) => c.code);

    it('keeps the design order when no child order is stored', () => {
      expect(codes(engine.sortChildren(list, {}))).toEqual([
        'Survey',
        'G1',
        'Q1',
        'Q2',
        'G2',
      ]);
    });

    it('reorders top-level children by their stored `.order`', () => {
      expect(
        codes(engine.sortChildren(list, { 'G1.order': 2, 'G2.order': 1 })),
      ).toEqual(['Survey', 'G2', 'G1', 'Q1', 'Q2']);
    });

    it('reorders nested children, keeping each subtree contiguous', () => {
      expect(
        codes(engine.sortChildren(list, { 'Q1.order': 2, 'Q2.order': 1 })),
      ).toEqual(['Survey', 'G1', 'Q2', 'Q1', 'G2']);
    });

    it('falls back to natural position for children without an order (stable)', () => {
      const flat = [
        { code: 'G1', children: ['Q1', 'Q2', 'Q3'] },
        { code: 'Q1', children: [] },
        { code: 'Q2', children: [] },
        { code: 'Q3', children: [] },
      ] as unknown as Parameters<EngineService['sortChildren']>[0];
      // Q3 jumps to 1; Q1 (natural 1) ties with it but sorts stably first; Q2 stays.
      expect(codes(engine.sortChildren(flat, { 'Q3.order': 1 }))).toEqual([
        'G1',
        'Q1',
        'Q3',
        'Q2',
      ]);
    });
  });
});
