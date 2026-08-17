import { aggregateMatrix } from '../src/modules/responses/analytics.service';

const opt = (code: string) => ({ code, label: code });

describe('aggregateMatrix composite keying', () => {
  it('does not truncate a cell value that contains a space', () => {
    const out = aggregateMatrix(
      [{ r1: 'New York' }],
      [opt('r1')],
      [opt('c1')],
      'MATRIX',
    );
    // The unexpected "New York" value must survive intact, not become "New".
    expect(out).toContainEqual({ rowCode: 'r1', columnCode: 'New York', count: 1 });
    // Declared cells are still seeded at 0.
    expect(out).toContainEqual({ rowCode: 'r1', columnCode: 'c1', count: 0 });
  });

  it('keeps (a, "b c") and ("a b", c) as distinct pairs (no delimiter collision)', () => {
    const out = aggregateMatrix(
      [{ a: 'b c' }, { 'a b': 'c' }],
      [],
      [],
      'MATRIX',
    );
    expect(out).toContainEqual({ rowCode: 'a', columnCode: 'b c', count: 1 });
    expect(out).toContainEqual({ rowCode: 'a b', columnCode: 'c', count: 1 });
  });

  it('counts multi-choice selections whose values contain spaces', () => {
    const out = aggregateMatrix(
      [{ r1: ['New York', 'San Jose'] }, { r1: ['New York'] }],
      [opt('r1')],
      [],
      'MCQ_ARRAY',
    );
    expect(out).toContainEqual({ rowCode: 'r1', columnCode: 'New York', count: 2 });
    expect(out).toContainEqual({ rowCode: 'r1', columnCode: 'San Jose', count: 1 });
  });
});
