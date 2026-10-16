import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EngineService } from '../src/engine/engine.service';
import { SnapshotReason } from '../src/modules/design/design-snapshot.entity';
import {
  deletedComponents,
  snapshotReason,
} from '../src/modules/design/design-snapshot.service';

const MIN = 60_000;
const NOW = 1_000 * MIN;

describe('snapshotReason', () => {
  const reason = (
    event: SnapshotReason | null,
    lastSnapshotAt: number | null,
    anchor = lastSnapshotAt ?? NOW,
  ) => snapshotReason({ event, lastSnapshotAt, anchor, now: NOW, intervalMs: 30 * MIN });

  it('takes none for a plain edit inside the interval', () => {
    expect(reason(null, NOW - 29 * MIN)).toBeNull();
  });

  it('takes a TIMER snapshot once the interval elapses', () => {
    expect(reason(null, NOW - 30 * MIN)).toBe(SnapshotReason.TIMER);
  });

  it('runs the timer from the anchor when there is no snapshot yet', () => {
    expect(reason(null, null, NOW - 31 * MIN)).toBe(SnapshotReason.TIMER);
    expect(reason(null, null, NOW - 5 * MIN)).toBeNull();
  });

  it.each([
    SnapshotReason.DELETE,
    SnapshotReason.CHANGE_CODE,
    SnapshotReason.TRANSLATIONS_IMPORT,
  ])('snapshots %s outside the cooldown', (event) => {
    expect(reason(event, NOW - 3 * MIN)).toBe(event);
    expect(reason(event, null)).toBe(event);
  });

  it.each([
    SnapshotReason.DELETE,
    SnapshotReason.CHANGE_CODE,
    SnapshotReason.TRANSLATIONS_IMPORT,
  ])('skips %s within the cooldown of any snapshot, so a burst keeps the first', (event) => {
    expect(reason(event, NOW - 1 * MIN)).toBeNull();
  });

  it('always snapshots RESTORE, even right after another snapshot', () => {
    expect(reason(SnapshotReason.RESTORE, NOW)).toBe(SnapshotReason.RESTORE);
  });
});

describe('deletedComponents', () => {
  const index = (...codes: string[]) => codes.map((code) => ({ code }));
  const engine = new EngineService();
  const isQuestionCode = (code: string) => engine.isQuestionCode(code);

  it('lists removed groups and questions', () => {
    expect(
      deletedComponents(
        index('Survey', 'G1', 'Q1', 'Q2', 'G2'),
        index('Survey', 'G1', 'Q1'),
        isQuestionCode,
      ),
    ).toEqual(['Q2', 'G2']);
  });

  it('ignores removed answer options and additions', () => {
    expect(
      deletedComponents(
        index('Survey', 'G1', 'Q1', 'Q1A1', 'Q1A2', 'Q1Ac1'),
        index('Survey', 'G1', 'Q1', 'Q1A1', 'Q3'),
        isQuestionCode,
      ),
    ).toEqual([]);
  });
});

describe('restoring a snapshot (survey JSON only)', () => {
  const engine = new EngineService();

  it('re-validates the stored survey JSON back to the same design', async () => {
    const fixture = readFileSync(join(__dirname, 'fixtures', 'survey-design.json'), 'utf8');
    const original = await engine.validate(fixture);
    const restored = await engine.validate(JSON.stringify(original.survey));
    expect(restored.componentIndexList).toEqual(original.componentIndexList);
    expect(restored.schema).toEqual(original.schema);
    expect(restored.script).toEqual(original.script);
    expect(engine.toDesignerInput(restored)).toEqual(engine.toDesignerInput(original));
  });
});
