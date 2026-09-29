/**
 * Survey texts as CSV for translators: one row per text (`code`, `key`), one
 * column per survey language. Works on the designer's flat, code-keyed state
 * (`DesignerInput.state`), the same shape the designer holds.
 */

export interface DesignComponent {
  content?: Record<string, Record<string, unknown>>;
  children?: { code: string; qualifiedCode?: string }[];
  defaultLang?: { code: string };
  additionalLang?: { code: string }[];
}

export type DesignState = Record<string, DesignComponent>;

/** One text to write: the payload of design-core's `changeContent`. */
export interface ContentChange {
  code: string;
  lang: string;
  key: string;
  value: string;
}

const FIXED = ['code', 'key'];
const BOM = String.fromCharCode(0xfeff);

/** How the editor saves a paragraph of text. */
const P_OPEN = '<p style="margin: 0px;">';
const P_CLOSE = '</p>';

const inEditorParagraph = (v: string) => v.startsWith(P_OPEN) && v.endsWith(P_CLOSE);

/**
 * The text inside the editor's paragraph, so translators see `Yes` instead of
 * `<p style="margin: 0px;">Yes</p>`. Several paragraphs stay HTML, and so does
 * a text Excel would read as a formula (`=`, `+`, `-`, `@`).
 */
function unwrap(v: string): string {
  if (!inEditorParagraph(v)) return v;
  const inner = v.slice(P_OPEN.length, -P_CLOSE.length);
  return inner.includes(P_CLOSE) || /^[=+\-@]/.test(inner) ? v : inner;
}

const isText = (v: unknown): v is string =>
  typeof v === 'string' && unwrap(v).trim() !== '';

/** Base language first, then the additional ones (the designer's `languagesList`). */
function surveyLangs(state: DesignState): { mainLang: string; langs: string[] } {
  const mainLang = state.Survey.defaultLang?.code ?? 'en';
  const extra = (state.Survey.additionalLang ?? []).map((l) => l.code);
  return { mainLang, langs: [mainLang, ...extra] };
}

function walk(
  state: DesignState,
  code: string,
  visit: (code: string, comp: DesignComponent) => void,
): void {
  const comp = state[code];
  if (!comp) return;
  visit(code, comp);
  for (const child of comp.children ?? []) {
    walk(state, child.qualifiedCode ?? child.code, visit);
  }
}

export function toCsvRows(state: DesignState): string[][] {
  const { mainLang, langs } = surveyLangs(state);
  const rows = [[...FIXED, ...langs]];
  walk(state, 'Survey', (code, comp) => {
    for (const [key, value] of Object.entries(comp.content?.[mainLang] ?? {})) {
      if (!isText(value)) continue;
      const values = langs.map((l) => unwrap(String(comp.content?.[l]?.[key] ?? '')));
      rows.push([code, key, ...values]);
    }
  });
  return rows;
}

const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;

/** Starts with a BOM so Excel reads the file as UTF-8. */
export const toCsv = (rows: string[][]): string =>
  BOM + rows.map((row) => row.map(quote).join(',')).join('\n');

export function parseCsv(text: string): string[][] {
  // Node keeps the BOM Excel writes, and the header check needs it gone.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  // Excel set to a decimal-comma locale (de, fr, nl, es, pt) saves with `;`.
  const sep = /^"?code"?;/.test(text) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted && ch === '"' && text[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (!quoted && (ch === sep || ch === '\n')) {
      row.push(cell);
      cell = '';
      if (ch === '\n') {
        rows.push(row);
        row = [];
      }
    } else if (quoted || ch !== '\r') {
      cell += ch;
    }
  }
  rows.push([...row, cell]);
  return rows.filter((r) => r.some(Boolean));
}

/**
 * The texts the file changes, as `changeContent` payloads, or null when the
 * header isn't `code,key,…`.
 */
export function csvChanges(
  rows: string[][],
  state: DesignState,
  overrideMainLang: boolean,
): ContentChange[] | null {
  const [header = [], ...body] = rows;
  if (header.slice(0, FIXED.length).join() !== FIXED.join()) return null;
  const { mainLang, langs } = surveyLangs(state);
  const allowed = new Set(langs.filter((l) => overrideMainLang || l !== mainLang));
  const columns = header.slice(FIXED.length);
  const changes: ContentChange[] = [];

  for (const [code, key, ...values] of body) {
    const content = state[code]?.content;
    const base = content?.[mainLang]?.[key];
    if (!isText(base)) continue;
    const wrap = inEditorParagraph(base);
    columns.forEach((lang, i) => {
      const cell = values[i];
      if (!cell || !allowed.has(lang)) return;
      // The export took the editor's paragraph off, so put it back.
      const value = wrap && !cell.startsWith('<p') ? P_OPEN + cell + P_CLOSE : cell;
      const saved = String(content?.[lang]?.[key] ?? '');
      if (unwrap(value) === unwrap(saved)) return;
      changes.push({ code, lang, key, value });
    });
  }
  return changes;
}
