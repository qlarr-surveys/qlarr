import {
  csvChanges,
  DesignState,
  parseCsv,
  toCsv,
  toCsvRows,
} from '../src/modules/design/translations-csv';

const BOM = String.fromCharCode(0xfeff);

/** A flat designer state: survey → page → question (with a hint) → answer. */
const state = (): DesignState => ({
  Survey: {
    defaultLang: { code: 'en' },
    additionalLang: [{ code: 'ar' }],
    content: {
      en: { label: '<p>Customer feedback</p>' },
      ar: { label: '<p>آراء العملاء</p>' },
    },
    children: [{ code: 'G1', qualifiedCode: 'G1' }],
  },
  G1: {
    content: { en: { label: 'Page one' } },
    children: [{ code: 'Q1', qualifiedCode: 'Q1' }],
  },
  Q1: {
    content: {
      en: { label: '<p>Do you use "our" app, daily?</p>', hint: 'Pick one\nanswer', order: 3 },
      ar: { hint: 'اختر إجابة' },
    },
    children: [{ code: 'A1', qualifiedCode: 'Q1A1' }],
  },
  Q1A1: { content: { en: { label: '<p>Yes</p>', blank: '  ' }, ar: { extra: 'نعم' } } },
});

const exported = [
  ['code', 'key', 'en', 'ar'],
  ['Survey', 'label', '<p>Customer feedback</p>', '<p>آراء العملاء</p>'],
  ['G1', 'label', 'Page one', ''],
  ['Q1', 'label', '<p>Do you use "our" app, daily?</p>', ''],
  ['Q1', 'hint', 'Pick one\nanswer', 'اختر إجابة'],
  ['Q1A1', 'label', '<p>Yes</p>', ''],
];

describe('toCsvRows', () => {
  it('walks the survey in order, one row per base-language text, base language first', () => {
    expect(toCsvRows(state())).toEqual(exported);
  });

  it('uses en when the survey has no defaultLang', () => {
    const s = state();
    delete s.Survey.defaultLang;
    delete s.Survey.additionalLang;
    expect(toCsvRows(s)[0]).toEqual(['code', 'key', 'en']);
  });
});

describe('toCsv and parseCsv', () => {
  it('round-trips quotes, commas, line breaks and Arabic', () => {
    expect(parseCsv(toCsv(exported))).toEqual(exported);
  });

  it('starts the file with a BOM so Excel reads UTF-8', () => {
    expect(toCsv(exported).charCodeAt(0)).toBe(0xfeff);
  });

  it('reads a file Excel saved: BOM, CRLF row ends, a trailing line end', () => {
    const csv = BOM + 'code,key,en,ar\r\nQ1,hint,"Pick one\nanswer",اختر\r\nG1,label,Page one,\r\n';
    expect(parseCsv(csv)).toEqual([
      ['code', 'key', 'en', 'ar'],
      ['Q1', 'hint', 'Pick one\nanswer', 'اختر'],
      ['G1', 'label', 'Page one', ''],
    ]);
  });

  it('reads a semicolon file, as Excel saves it in decimal-comma locales', () => {
    const csv = BOM + 'code;key;en;ar\r\nG1;label;"Page; one";الصفحة\r\nQ1;hint;Pick one, please;\r\n';
    expect(parseCsv(csv)).toEqual([
      ['code', 'key', 'en', 'ar'],
      ['G1', 'label', 'Page; one', 'الصفحة'],
      ['Q1', 'hint', 'Pick one, please', ''],
    ]);
  });
});

describe('csvChanges', () => {
  const edited = [
    ['code', 'key', 'en', 'ar', 'fr'],
    // ar unchanged, fr isn't a survey language
    ['Survey', 'label', '<p>Customer feedback</p>', '<p>آراء العملاء</p>', '<p>Avis</p>'],
    // the base language changed
    ['G1', 'label', 'Changed page', 'الصفحة الأولى', ''],
    // an empty cell isn't a deletion
    ['Q1', 'hint', 'Pick one\nanswer', '', ''],
    // no base-language text under that key, unknown code
    ['Q1', 'missing', 'x', 'y', ''],
    ['Q404', 'label', 'x', 'y', ''],
    ['Q1A1', 'label', '<p>Yes</p>', '<p>نعم</p>', ''],
  ];

  it('returns null when the header does not start with code,key', () => {
    expect(csvChanges([['id', 'en'], ['Q1', 'x']], state(), false)).toBeNull();
    expect(csvChanges(parseCsv('id;en\nQ1;x'), state(), false)).toBeNull();
    expect(csvChanges([], state(), false)).toBeNull();
  });

  it('returns only real changes to the additional languages', () => {
    expect(csvChanges(edited, state(), false)).toEqual([
      { code: 'G1', lang: 'ar', key: 'label', value: 'الصفحة الأولى' },
      { code: 'Q1A1', lang: 'ar', key: 'label', value: '<p>نعم</p>' },
    ]);
  });

  it('changes the base language only with overrideMainLang', () => {
    expect(csvChanges(edited, state(), true)).toEqual([
      { code: 'G1', lang: 'en', key: 'label', value: 'Changed page' },
      { code: 'G1', lang: 'ar', key: 'label', value: 'الصفحة الأولى' },
      { code: 'Q1A1', lang: 'ar', key: 'label', value: '<p>نعم</p>' },
    ]);
  });

  it('finds nothing to change in a file exported from the same survey', () => {
    const s = state();
    expect(csvChanges(parseCsv(toCsv(toCsvRows(s))), s, true)).toEqual([]);
  });

  it('reads the changes from a semicolon file', () => {
    const csv = 'code;key;en;ar\nG1;label;Page one;الصفحة\n';
    expect(csvChanges(parseCsv(csv), state(), false)).toEqual([
      { code: 'G1', lang: 'ar', key: 'label', value: 'الصفحة' },
    ]);
  });
});
