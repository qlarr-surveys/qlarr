/**
 * The rows of a `RETURNING` query. TypeORM's postgres driver returns a plain row
 * array for INSERT, but `[rows, affectedCount]` for UPDATE and DELETE.
 */
export function returnedRows<T = unknown>(result: unknown): T[] {
  if (
    Array.isArray(result) &&
    result.length === 2 &&
    Array.isArray(result[0]) &&
    typeof result[1] === 'number'
  ) {
    return result[0] as T[];
  }
  return result as T[];
}
