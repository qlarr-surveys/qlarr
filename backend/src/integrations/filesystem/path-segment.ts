import { InvalidFilePathException } from './filesystem.exceptions';

/**
 * True when `segment` is exactly one plain path component: a non-empty string
 * that is not `.` or `..` and holds no `/`, `\` or NUL. Every piece of a
 * storage key that can come from outside (surveyId, responseId, filename) must
 * pass this before it is joined into a path or key, so it can only ever name an
 * entry inside its own folder. Shared by the storage helper (the last line of
 * defence) and `FileNamePipe` (the route-param edge).
 */
export function isSafePathSegment(segment: unknown): segment is string {
  return (
    typeof segment === 'string' &&
    segment.length > 0 &&
    segment !== '.' &&
    segment !== '..' &&
    !/[/\\\0]/.test(segment)
  );
}

/** `isSafePathSegment`, throwing `InvalidFilePathException` (400) on failure. */
export function assertSafePathSegment(segment: unknown): asserts segment is string {
  if (!isSafePathSegment(segment)) throw new InvalidFilePathException();
}
