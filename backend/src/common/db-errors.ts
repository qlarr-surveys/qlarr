import { QueryFailedError } from 'typeorm';

/** Postgres `unique_violation` SQLSTATE. */
const UNIQUE_VIOLATION = '23505';

/**
 * True when an error is a Postgres unique-constraint violation. Repositories map
 * this to a typed domain exception ONLY where a duplicate is a legitimate
 * user-facing outcome (survey name, user email, permission pair); other write
 * paths let it surface, since an unexpected collision there is a real bug.
 */
export const isUniqueViolation = (err: unknown): boolean =>
  err instanceof QueryFailedError &&
  (err.driverError as { code?: string } | undefined)?.code === UNIQUE_VIOLATION;
