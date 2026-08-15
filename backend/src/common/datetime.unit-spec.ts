import { BadRequestException } from '@nestjs/common';
import {
  assertEventTimes,
  assertWallClock,
  assertWallClockRequired,
  formatWallClockUtc,
  isWallClock,
  nowUtcString,
  timestampTextTransformer,
  wallClockToInstant,
} from './datetime';

/**
 * `timestamp without time zone` columns hold UTC wall clocks.
 * node-postgres reads them back as a JS `Date` built by
 * interpreting the stored text in the process zone. The backend pins `TZ=UTC`
 * (Dockerfile / npm scripts), so that Date's UTC components equal the stored
 * wall clock and UTC has no DST gap for a value to drift into. These tests
 * exercise the transformer directly with UTC-built Dates — the exact shape the
 * driver hands it under that invariant — plus the string/array paths.
 */
describe('timestampTextTransformer (UTC wall clock)', () => {
  // A Date whose UTC components are the given wall clock — what pg yields under
  // TZ=UTC. Built via Date.UTC so the test itself is timezone-independent.
  const utc = (y: number, mo: number, d: number, h: number, mi: number, s = 0) =>
    new Date(Date.UTC(y, mo - 1, d, h, mi, s));

  describe('from (read)', () => {
    it('formats a Date to the "yyyy-MM-dd HH:mm:ss" literal', () => {
      expect(timestampTextTransformer.from(utc(2024, 1, 15, 10, 30, 0))).toBe(
        '2024-01-15 10:30:00',
      );
    });

    it('does not drift a DST spring-forward gap value (02:30 stays 02:30)', () => {
      // Under a DST zone this wall clock is unrepresentable and would shift to
      // 03:30; under the pinned UTC zone it round-trips exactly.
      expect(timestampTextTransformer.from(utc(2024, 3, 31, 2, 30, 0))).toBe(
        '2024-03-31 02:30:00',
      );
    });

    it('drops sub-second precision on a Date', () => {
      expect(timestampTextTransformer.from(utc(2024, 3, 31, 2, 30, 0))).toBe(
        '2024-03-31 02:30:00',
      );
      expect(formatWallClockUtc(new Date(Date.UTC(2024, 2, 31, 2, 30, 0, 123)))).toBe(
        '2024-03-31 02:30:00',
      );
    });

    it('also accepts a raw string, trimming separator/zone/fraction to seconds', () => {
      expect(timestampTextTransformer.from('2024-01-15T10:30:00.123456Z')).toBe(
        '2024-01-15 10:30:00',
      );
      expect(timestampTextTransformer.from('2024-01-15 10:30:00')).toBe(
        '2024-01-15 10:30:00',
      );
    });

    it('passes null through', () => {
      expect(timestampTextTransformer.from(null)).toBeNull();
    });
  });

  describe('to (write)', () => {
    it('writes the wall-clock literal verbatim', () => {
      expect(timestampTextTransformer.to('2024-03-31 02:30:00')).toBe(
        '2024-03-31 02:30:00',
      );
    });

    it('accepts a Kotlin/Jackson LocalDateTime array (Android offline sync)', () => {
      // [year, month(1-based), day, hour, minute, second?] with trailing zeros omitted.
      expect(timestampTextTransformer.to([2024, 1, 15, 10, 30])).toBe(
        '2024-01-15 10:30:00',
      );
    });
  });

  describe('wallClockToInstant', () => {
    it('parses the wall clock AS UTC (independent of process zone)', () => {
      expect(wallClockToInstant('2024-01-15 10:30:00')).toBe(
        Date.UTC(2024, 0, 15, 10, 30, 0),
      );
    });

    it('round-trips against formatWallClockUtc', () => {
      const ms = wallClockToInstant('2024-03-31 02:30:00');
      expect(formatWallClockUtc(new Date(ms))).toBe('2024-03-31 02:30:00');
    });

    it('is consistent with nowUtcString to the whole second', () => {
      const s = nowUtcString();
      expect(wallClockToInstant(s)).toBe(Date.parse(`${s.replace(' ', 'T')}Z`));
    });
  });

  describe('isWallClock', () => {
    it('accepts a canonical wall clock (incl. leap day)', () => {
      expect(isWallClock('2024-01-15 10:30:00')).toBe(true);
      expect(isWallClock('2024-02-29 00:00:00')).toBe(true);
    });

    it('rejects wrong shapes, out-of-range, rollovers, and non-strings', () => {
      for (const bad of [
        '2025-06-02T09:00:00.000Z', // ISO T/Z/fraction (the format check rejects this)
        '2024-02-30 00:00:00', // Feb 30 rolls over → not a real date
        '2024-13-01 00:00:00', // month out of range
        '2024-01-15 25:00:00', // hour out of range
        '2024-1-5 1:2:3', // not zero-padded
        'tomorrow',
        '',
        null,
        undefined,
        1700000000000,
        ['2024', '01'],
      ]) {
        expect(isWallClock(bad as unknown)).toBe(false);
      }
    });
  });

  describe('assertWallClock / assertWallClockRequired (400 at the boundary)', () => {
    it('assertWallClock allows null/undefined (optional field)', () => {
      expect(() => assertWallClock(null, 'startDate')).not.toThrow();
      expect(() => assertWallClock(undefined, 'startDate')).not.toThrow();
      expect(() => assertWallClock('2024-01-15 10:30:00', 'startDate')).not.toThrow();
    });

    it('assertWallClock throws 400 for a present-but-malformed value', () => {
      expect(() => assertWallClock('tomorrow', 'startDate')).toThrow(
        BadRequestException,
      );
      // The mixed-format footgun that mis-orders a valid window (finding #56 B).
      expect(() =>
        assertWallClock('2025-06-02T09:00:00.000Z', 'startDate'),
      ).toThrow(BadRequestException);
    });

    it('assertWallClockRequired also rejects null/undefined', () => {
      expect(() => assertWallClockRequired(null, 'time')).toThrow(
        BadRequestException,
      );
      expect(() => assertWallClockRequired('2024-01-15 10:30:00', 'time')).not.toThrow();
    });
  });

  describe('assertEventTimes', () => {
    it('passes an absent list or events with valid times', () => {
      expect(() => assertEventTimes(undefined)).not.toThrow();
      expect(() =>
        assertEventTimes([
          { name: 'Navigation', time: '2024-01-15 10:30:00' },
          { name: 'Location', time: '2024-01-15 10:31:00' },
        ]),
      ).not.toThrow();
    });

    it('rejects a non-array, a missing time, or a malformed time', () => {
      expect(() => assertEventTimes('nope')).toThrow(BadRequestException);
      expect(() => assertEventTimes([{ name: 'Navigation' }])).toThrow(
        BadRequestException,
      );
      expect(() =>
        assertEventTimes([{ name: 'Navigation', time: 'tomorrow' }]),
      ).toThrow(BadRequestException);
    });
  });
});
