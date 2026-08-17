/** Shared input validators. */

/** trim().length in 1..50. */
export const isValidName = (s: string): boolean => {
  const len = s.trim().length;
  return len >= 1 && len <= 50;
};

// Email validation regex (case-insensitive).
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
export const isValidEmail = (s: string): boolean => EMAIL_RE.test(s);

/** A canonical UUID (any version/variant). Reject a missing/malformed id
 *  before it reaches a `uuid` column (Postgres `22P02` → 500) or typeorm's
 *  `findOne` where-clause footgun. */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string | undefined | null): s is string =>
  !!s && UUID_RE.test(s);
