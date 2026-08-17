import { BadRequestException } from '@nestjs/common';
import { ValueTransformer } from 'typeorm';

/**
 * Wall-clock date handling for `timestamp without time zone` columns, using the
 * `DATE_TIME_UTC_FORMAT` "yyyy-MM-dd HH:mm:ss".
 *
 * These columns store/read a bare wall clock with no zone.
 * The whole invariant rests on one thing: the process runs in UTC (`TZ=UTC`,
 * pinned in the runtime env — Docker/npm scripts — with `main.ts` as a belt).
 * Given that:
 *  - READ: node-postgres parses a zone-less `timestamp` into a JS `Date` by
 *    interpreting the stored text in the process zone. Under UTC that Date's UTC
 *    components equal the stored wall clock exactly, and UTC has no DST gap for a
 *    value to drift into. `from` formats those UTC components back to the literal.
 *    (It also accepts a plain string, in case a driver/path hands back raw text.)
 *  - WRITE: we hand Postgres the literal string; for a zone-less `timestamp`
 *    it is parsed verbatim (no conversion).
 * The only place a zone is chosen is `nowUtcString()`, which stamps UTC.
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/** Format a Date's UTC components as "yyyy-MM-dd HH:mm:ss" — used for
 *  stored/S3 timestamps. */
export function formatWallClockUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

/** Current time as a UTC wall clock "yyyy-MM-dd HH:mm:ss". */
export function nowUtcString(): string {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

/**
 * Epoch milliseconds for a UTC wall-clock string ("yyyy-MM-dd HH:mm:ss"). The
 * stored value is zone-less UTC, so it is parsed AS UTC (append `Z`) rather than
 * trusting the process zone. Use this for date *arithmetic* — durations,
 * deadlines, elapsed time; for *ordering*, compare the wall-clock strings
 * directly against `nowUtcString()` (they sort chronologically).
 */
export function wallClockToInstant(wallClock: string): number {
  return Date.parse(`${wallClock.replace(' ', 'T')}Z`);
}

const WALL_CLOCK_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/**
 * True iff `value` is a canonical "yyyy-MM-dd HH:mm:ss" wall clock naming a real
 * instant. The regex fixes the shape (rejecting ISO `T`/`Z`/fractions), and the
 * round-trip through `formatWallClockUtc` rejects out-of-range and rollover
 * values (`2024-02-30` → Mar 1). This enforces the `DATE_TIME_UTC_FORMAT` at the
 * request boundary — which the interface-typed DTOs here otherwise lose.
 */
export function isWallClock(value: unknown): value is string {
  if (typeof value !== 'string' || !WALL_CLOCK_RE.test(value)) return false;
  const ms = wallClockToInstant(value);
  return !Number.isNaN(ms) && formatWallClockUtc(new Date(ms)) === value;
}

const wallClockError = (field: string): BadRequestException =>
  new BadRequestException(
    `Invalid ${field}: expected a "yyyy-MM-dd HH:mm:ss" UTC timestamp`,
  );

/**
 * Reject a malformed *optional* request timestamp with 400 when a value doesn't
 * match `DATE_TIME_UTC_FORMAT`.
 * `null`/`undefined` pass (the field is absent); use `assertWallClockRequired`
 * when the field is mandatory. Call these at the controller boundary so bad
 * input never reaches a service or a `timestamp` column.
 */
export function assertWallClock(value: unknown, field: string): void {
  if (value != null && !isWallClock(value)) throw wallClockError(field);
}

/** Like `assertWallClock`, but the field is mandatory: `null`/`undefined` also 400. */
export function assertWallClockRequired(value: unknown, field: string): void {
  if (!isWallClock(value)) throw wallClockError(field);
}

/**
 * Validate the mandatory `time` on every event in a request list. An absent
 * list passes; a non-array, or any event whose `time` isn't a canonical wall
 * clock, is a 400.
 */
export function assertEventTimes(events: unknown, field = 'events'): void {
  if (events == null) return;
  if (!Array.isArray(events)) {
    throw new BadRequestException(`Invalid ${field}: expected an array`);
  }
  events.forEach((e, i) =>
    assertWallClockRequired((e as { time?: unknown })?.time, `${field}[${i}].time`),
  );
}

/**
 * The Android app serializes a date as an array of numbers —
 * `[year, month(1-based), day, hour, minute, second?, nano?]` — with trailing
 * zero components (seconds/nanos) omitted. It sends offline-response
 * `startDate`/`submitDate` in this shape, so accept it. Components are already a
 * bare UTC wall clock, so we format them verbatim.
 */
function localDateTimeArrayToWallClock(arr: number[]): string {
  const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0] = arr;
  return (
    `${year}-${pad(month)}-${pad(day)} ` +
    `${pad(hour)}:${pad(minute)}:${pad(second)}`
  );
}

/** Normalize any inbound representation to the "yyyy-MM-dd HH:mm:ss" literal. */
function toWallClock(value: Date | string | number[] | null): string | null {
  if (value == null) return null;
  // node-postgres hands zone-less timestamps back as a JS Date. Under TZ=UTC its
  // UTC components equal the stored wall clock, so format them verbatim.
  if (value instanceof Date) return formatWallClockUtc(value);
  // Numeric date array from the Android offline-sync client.
  if (Array.isArray(value)) return localDateTimeArrayToWallClock(value);
  // A string like "2024-01-15T10:30:00.000Z" or "2024-01-15 10:30:00": keep the
  // date+time, drop the separator/zone/fraction down to seconds.
  return value.replace('T', ' ').slice(0, 19);
}

/**
 * TypeORM transformer for zone-less timestamp columns: the entity field is a
 * "yyyy-MM-dd HH:mm:ss" string; the column stays a real `timestamp`. Reads arrive
 * as a JS `Date` (or a raw string on paths that skip pg's date parser); `from`
 * normalizes both, and `TZ=UTC` keeps the `Date` case exact and DST-free.
 */
export const timestampTextTransformer: ValueTransformer = {
  from: (value: Date | string | null): string | null => toWallClock(value),
  // `to` may receive a numeric date array from the Android
  // offline-sync client, not just the string the entity field is typed as.
  to: (value: string | number[] | null): string | null => toWallClock(value),
};
