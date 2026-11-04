import { snapshotDue } from '../src/modules/design/design-snapshot.service';

const MIN = 60_000;
const NOW = 1_000 * MIN;

describe('snapshotDue', () => {
  const due = (lastAt: number | null) => snapshotDue({ lastAt, now: NOW });

  it('is due when there is no earlier snapshot', () => {
    expect(due(null)).toBe(true);
  });

  it('is due at most once a minute', () => {
    expect(due(NOW - MIN + 1)).toBe(false);
    expect(due(NOW - MIN)).toBe(true);
  });
});
