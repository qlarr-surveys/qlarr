/**
 * Respondent-side lookups over a hierarchical-autocomplete's rows (an array of
 * per-language objects, `{ en: ["Germany","Bavaria","Munich"], de: [...] }`).
 * Pure functions — the data is bounded per question, so the cascade is filtered
 * in memory.
 *
 * Language: the respondent's language when any row carries it, otherwise the
 * survey's default language. Rows that lack the search language are left out
 * (incomplete data is the designer's problem).
 */
import { HierarchicalRow } from './hierarchical-autocomplete-csv';

/** The language to search in: `lang` if any row has it, else `defaultLang`. */
export function searchLang(
  rows: HierarchicalRow[],
  lang: string,
  defaultLang: string,
): string {
  return rows.some((row) => Array.isArray(row[lang])) ? lang : defaultLang;
}

const matchesPrefix = (path: string[], prefix: string[]): boolean =>
  prefix.every((value, i) => path[i] === value);

/**
 * Distinct values at `level` among the rows whose levels above match `prefix`,
 * matching the query like the plain autocomplete does: case-insensitive
 * substring, sorted, capped at `limit`.
 */
export function searchLevel(
  rows: HierarchicalRow[],
  lang: string,
  level: number,
  prefix: string[],
  query: string,
  limit: number,
): string[] {
  const needle = query.toLowerCase();
  const matches = new Set<string>();
  for (const row of rows) {
    const path = row[lang];
    if (!Array.isArray(path) || !matchesPrefix(path, prefix)) continue;
    const value = path[level];
    if (value && value.toLowerCase().includes(needle)) matches.add(value);
  }
  return [...matches].sort((a, b) => a.localeCompare(b)).slice(0, limit);
}

/** The row whose path in `lang` is exactly `path` (paths are unique per language). */
export function findRow(
  rows: HierarchicalRow[],
  lang: string,
  path: string[],
): HierarchicalRow | null {
  return (
    rows.find((row) => {
      const candidate = row[lang];
      return (
        Array.isArray(candidate) &&
        candidate.length === path.length &&
        matchesPrefix(candidate, path)
      );
    }) ?? null
  );
}
