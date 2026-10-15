import { readFileSync } from 'fs';
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

  describe('calculations', () => {
    // The fixture has a number question, Q880htp.
    let processedSurvey: string;
    beforeAll(async () => {
      processedSurvey = JSON.stringify(
        await engine.validate(
          readFileSync(`${__dirname}/fixtures/survey-design.json`, 'utf8'),
        ),
      );
    });
    const calc = (code: string, expression: string) => ({
      code,
      label: `${code} label`,
      expression,
    });

    it('validates a set, keeping order and labels', async () => {
      const validated = await engine.validateCalculations(processedSurvey, [
        calc('double', 'Q880htp.value * 2'),
        calc('mode', 'Survey.mode'),
      ]);
      expect(validated).toEqual([
        { ...calc('double', 'Q880htp.value * 2'), errors: [] },
        { ...calc('mode', 'Survey.mode'), errors: [] },
      ]);
    });

    it('reports errors on each calculation', async () => {
      const validated = await engine.validateCalculations(processedSurvey, [
        calc('Bad', '1'),
        calc('dup', '1'),
        calc('dup', '2'),
        calc('broken', 'Q880htp.value +'),
        calc('unknown', 'Q999.value'),
        calc('notallowed', 'Q880htp.relevance'),
      ]);
      const errors = validated.map((c) => c.errors ?? []);
      expect(errors[0]).toEqual([{ name: 'InvalidCode' }]);
      expect(errors[1]).toEqual([{ name: 'DuplicateCode' }]);
      expect(errors[2]).toEqual([{ name: 'DuplicateCode' }]);
      for (const e of errors.slice(3)) {
        expect(e).toEqual([
          expect.objectContaining({
            name: 'ScriptError',
            start: expect.any(Number),
            end: expect.any(Number),
          }),
        ]);
      }
      expect(errors[4][0]).toMatchObject({ start: 0, end: 10 });
      expect(validated.map((c) => c.label)).toEqual(
        ['Bad', 'dup', 'dup', 'broken', 'unknown', 'notallowed'].map(
          (c) => `${c} label`,
        ),
      );
    });

    it('calculates per response: results, no value, runtime errors', async () => {
      const validated = await engine.validateCalculations(processedSurvey, [
        calc('double', 'Q880htp.value * 2'),
        calc('mode', 'Survey.mode'),
        calc('nothing', 'null'),
        calc('fixed', 'Q880htp.value.toFixed(1)'),
      ]);
      const out = await engine.calculate(processedSurvey, validated, {
        r1: { 'Q880htp.value': 21, 'Survey.mode': 'online' },
        r2: {},
      });
      expect(out.r1).toEqual({
        results: { double: 42, mode: 'online', fixed: '21.0' },
        errors: {},
      });
      // Missing variables are undefined: undefined * 2 is NaN (serialized as
      // null, so no value), and reading a property of undefined throws.
      expect(out.r2.results).toEqual({});
      expect(Object.keys(out.r2.errors)).toEqual(['fixed']);
      expect(out.r2.errors.fixed.name).toBe('TypeError');
    });

    it('skips calculations that have validation errors', async () => {
      const validated = await engine.validateCalculations(processedSurvey, [
        calc('double', 'Q880htp.value * 2'),
        calc('broken', 'Q880htp.value +'),
      ]);
      const out = await engine.calculate(processedSurvey, validated, {
        r1: { 'Q880htp.value': 2 },
      });
      expect(out).toEqual({ r1: { results: { double: 4 }, errors: {} } });
    });
  });
});
