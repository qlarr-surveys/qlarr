/**
 * External data for a hierarchical-autocomplete question: rows of level values,
 * one bundle per language. Stored as an array of per-language objects
 * (`{ en: ["Germany","Bavaria","Munich"], de: [...] }`) — no stored key; rows are
 * identified only by position.
 *
 * Imported/exported as a single CSV with ONE COLUMN PER (language, level) — each
 * cell holds a single level value (no in-cell separators). The header carries the
 * structure: `"<level label> (<lang>)"`, e.g. `Country (en), City (en), Country
 * (de), City (de)`. On import the language is read from the trailing `(lang)` and
 * the level from the column's position within that language's group; the label
 * text is cosmetic. Each upload REPLACES the stored data entirely.
 *
 * Self-contained, separate from the survey translations (`translations-csv.ts`).
 * The ONLY thing shared with that module is the pure `parseCsv` utility.
 */
import { parseCsv } from '../design/translations-csv';
import { HierarchicalAutoCompleteMalformedInputException } from './survey.exceptions';

export type HierarchicalRow = Record<string, string[]>;

// Internal join for the per-language dedupe key — the NUL char, which never
// occurs in the (text) CSV data, so joined paths can never collide.
const UNIT = String.fromCharCode(0);

const bad = (): never => {
  throw new HierarchicalAutoCompleteMalformedInputException();
};

/** The language code from a header cell like `"City (en)"` -> `"en"`. */
function headerLang(cell: string): string {
  const match = /^(.*)\(([^)]+)\)\s*$/.exec(cell.trim());
  const lang = match?.[2]?.trim();
  if (!lang) return bad();
  return lang;
}

/** The languages present across all rows (sorted union). */
export function languagesOf(rows: HierarchicalRow[]): string[] {
  const langs = new Set<string>();
  for (const row of rows) for (const lang of Object.keys(row)) langs.add(lang);
  return [...langs].sort();
}

export interface ParseResult {
  rows: HierarchicalRow[];
  /** The languages the uploaded file carried values for, in header order. */
  imported: string[];
}

/**
 * Parse an uploaded CSV into the full row set. Columns are grouped by language
 * (read from each header's `(lang)` suffix); within a language the columns are
 * the levels in order. The result REPLACES whatever was stored — nothing is
 * merged with existing data, so the file must carry every row and language.
 *
 * Columns for a language not in `surveyLangs` are silently ignored; a file with
 * no survey language at all is malformed.
 */
export function fromCsv(
  csv: string,
  levels: number,
  surveyLangs: string[],
): ParseResult {
  if (!Number.isInteger(levels) || levels < 1) bad();

  const rows = parseCsv(csv);
  if (rows.length < 2) bad(); // header + at least one data row

  const header = rows[0].map((h) => h.trim());
  if (header.some((h) => h === '')) bad();

  // Column index -> language, grouped in order -> level positions per language.
  // Non-survey languages are skipped, their columns never read.
  const langColumns = new Map<string, number[]>();
  header.forEach((cell, i) => {
    const lang = headerLang(cell);
    if (!surveyLangs.includes(lang)) return;
    let cols = langColumns.get(lang);
    if (!cols) langColumns.set(lang, (cols = []));
    cols.push(i);
  });
  if (langColumns.size === 0) bad(); // no survey language in the file
  // Every language must contribute exactly one column per level.
  for (const cols of langColumns.values()) {
    if (cols.length !== levels) bad();
  }

  // Parse + validate every data row, enforcing per-language path uniqueness.
  const seenPerLang = new Map<string, Set<string>>();
  const parsed: HierarchicalRow[] = [];
  for (const raw of rows.slice(1)) {
    if (raw.length !== header.length) bad();
    const cells = raw.map((c) => c.trim());
    const values: HierarchicalRow = {};
    for (const [lang, cols] of langColumns) {
      const path = cols.map((i) => cells[i]);
      const filled = path.filter((v) => v !== '').length;
      if (filled === 0) continue; // this language has no value for this row
      if (filled !== path.length) bad(); // an incomplete path
      const key = path.join(UNIT);
      let seen = seenPerLang.get(lang);
      if (!seen) seenPerLang.set(lang, (seen = new Set()));
      if (seen.has(key)) bad(); // duplicate path within a language
      seen.add(key);
      values[lang] = path;
    }
    if (Object.keys(values).length === 0) bad(); // a row with no values at all
    parsed.push(values);
  }

  return {
    rows: parsed,
    imported: [...langColumns.keys()].filter((l) => seenPerLang.has(l)),
  };
}

const quote = (v: string): string => `"${v.replace(/"/g, '""')}"`;

/**
 * Serialize all rows to a single CSV, one column per (language, level). `langs`
 * (the survey's languages) sets which columns appear and in what order — every
 * one is emitted even with no data yet, so the download is a ready-to-fill
 * template; a language already in the data but not in `langs` is appended so
 * nothing is dropped. `labels` are the level names (base language) used in the
 * header, falling back to `Level N`. Starts with a BOM so Excel reads UTF-8.
 */
export function toCsv(
  rows: HierarchicalRow[],
  langs: string[],
  labels: string[],
): string {
  const BOM = String.fromCharCode(0xfeff);
  const present = languagesOf(rows);
  const columns =
    langs && langs.length
      ? [...langs, ...present.filter((l) => !langs.includes(l))]
      : present;
  const levels = labels.length;
  const label = (i: number): string => labels[i]?.trim() || `Level ${i + 1}`;

  const header: string[] = [];
  for (const lang of columns) {
    for (let i = 0; i < levels; i++) header.push(`${label(i)} (${lang})`);
  }
  const lines: string[][] = [header];
  for (const row of rows) {
    const line: string[] = [];
    for (const lang of columns) {
      const path = row[lang];
      for (let i = 0; i < levels; i++) line.push(path ? (path[i] ?? '') : '');
    }
    lines.push(line);
  }
  return BOM + lines.map((r) => r.map(quote).join(',')).join('\n');
}
