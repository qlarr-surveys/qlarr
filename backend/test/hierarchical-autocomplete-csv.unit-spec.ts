import {
  fromCsv,
  HierarchicalRow,
  languagesOf,
  toCsv,
} from '../src/modules/surveys/hierarchical-autocomplete-csv';
import { HierarchicalAutoCompleteMalformedInputException } from '../src/modules/surveys/survey.exceptions';

const BOM = String.fromCharCode(0xfeff);
const LANGS = ['en', 'de'];

describe('hierarchical-autocomplete CSV', () => {
  describe('fromCsv', () => {
    it('parses one column per (language, level) into per-language rows', () => {
      const csv = [
        'Country (en),City (en)',
        'Germany,Munich',
        'France,Paris',
      ].join('\n');
      const { rows, imported } = fromCsv(csv, 2, LANGS);
      expect(rows).toEqual([
        { en: ['Germany', 'Munich'] },
        { en: ['France', 'Paris'] },
      ]);
      expect(imported).toEqual(['en']);
    });

    it('accepts all languages in one file and reports them', () => {
      const csv = [
        'Country (en),City (en),Land (de),Stadt (de)',
        'Germany,Munich,Deutschland,München',
      ].join('\n');
      const { rows, imported } = fromCsv(csv, 2, LANGS);
      expect(rows).toEqual([
        { en: ['Germany', 'Munich'], de: ['Deutschland', 'München'] },
      ]);
      expect(imported).toEqual(['en', 'de']);
    });

    it('trims whitespace in headers and cells', () => {
      const { rows } = fromCsv(
        ['Country (en) , City (en)', ' Germany , Munich '].join('\n'),
        2,
        LANGS,
      );
      expect(rows).toEqual([{ en: ['Germany', 'Munich'] }]);
    });

    it('reports only languages that carried a value', () => {
      const csv = [
        'Country (en),City (en),Land (de),Stadt (de)',
        'Germany,Munich,,',
      ].join('\n');
      expect(fromCsv(csv, 2, LANGS).imported).toEqual(['en']);
    });
    it('allows a partial language (blank cells = no value for that row/lang)', () => {
      const csv = [
        'Country (en),City (en),Land (de),Stadt (de)',
        'Germany,Munich,Deutschland,München',
        'France,Paris,,',
      ].join('\n');
      const { rows } = fromCsv(csv, 2, LANGS);
      expect(rows[0].de).toEqual(['Deutschland', 'München']);
      expect(rows[1].de).toBeUndefined();
    });

    it('groups columns by language even when interleaved by level', () => {
      // Country(en), Land(de), City(en), Stadt(de) — en at cols 0,2; de at 1,3.
      const csv = [
        'Country (en),Land (de),City (en),Stadt (de)',
        'Germany,Deutschland,Munich,München',
      ].join('\n');
      const { rows } = fromCsv(csv, 2, LANGS);
      expect(rows).toEqual([
        { en: ['Germany', 'Munich'], de: ['Deutschland', 'München'] },
      ]);
    });
    it('silently ignores columns for non-survey languages', () => {
      const csv = [
        'Country (en),City (en),Pays (fr),Ville (fr),A (xx)',
        'Germany,Munich,Allemagne,Munich,whatever',
      ].join('\n');
      // fr/xx columns aren't validated either (xx has the wrong column count).
      const { rows, imported } = fromCsv(csv, 2, LANGS);
      expect(rows).toEqual([{ en: ['Germany', 'Munich'] }]);
      expect(imported).toEqual(['en']);
    });
  });

  describe('fromCsv — rejects malformed input', () => {
    const throws = (csv: string, levels = 2) =>
      expect(() => fromCsv(csv, levels, LANGS)).toThrow(
        HierarchicalAutoCompleteMalformedInputException,
      );

    it('a header cell without a (lang) suffix', () =>
      throws('Country,City\nGermany,Munich'));
    it('wrong column count for a language', () =>
      throws('A (en),B (en),C (en)\nx,y,z'));
    it('an incomplete path (a blank cell in a non-empty group)', () =>
      throws('Country (en),City (en)\nGermany,'));
    it('a duplicate path within a language', () =>
      throws('Country (en),City (en)\nGermany,Munich\nGermany,Munich'));
    it('a row with no values at all', () =>
      throws('Country (en),City (en)\n , '));
    it('header only, no data rows', () => throws('Country (en),City (en)'));
    it('non-positive level count', () => throws('Country (en)\nGermany', 0));
    it('no survey language in the file', () =>
      throws('Pays (fr),Ville (fr)\nAllemagne,Munich'));
  });

  describe('toCsv', () => {
    const rows: HierarchicalRow[] = [
      { en: ['Germany', 'Munich'], de: ['Deutschland', 'München'] },
      { en: ['France', 'Paris'] },
    ];

    it('emits one labelled column per (language, level), with a BOM', () => {
      expect(toCsv(rows, ['en'], ['Country', 'City'])).toBe(
        BOM +
          [
            '"Country (en)","City (en)","Country (de)","City (de)"',
            '"Germany","Munich","Deutschland","München"',
            '"France","Paris","",""',
          ].join('\n'),
      );
    });

    it('emits empty columns for a requested language with no data (template)', () => {
      expect(
        toCsv([{ en: ['Germany', 'Munich'] }], ['en', 'de'], ['Country', 'City']),
      ).toBe(
        BOM +
          [
            '"Country (en)","City (en)","Country (de)","City (de)"',
            '"Germany","Munich","",""',
          ].join('\n'),
      );
    });

    it('falls back to "Level N" when a level label is empty', () => {
      expect(toCsv([{ en: ['A', 'B'] }], ['en'], ['', ''])).toBe(
        BOM + ['"Level 1 (en)","Level 2 (en)"', '"A","B"'].join('\n'),
      );
    });

    it('round-trips through fromCsv', () => {
      const { rows: out } = fromCsv(
        toCsv(rows, ['en'], ['Country', 'City']),
        2,
        LANGS,
      );
      expect(out).toEqual([
        { en: ['Germany', 'Munich'], de: ['Deutschland', 'München'] },
        { en: ['France', 'Paris'] },
      ]);
    });
  });

  describe('languagesOf', () => {
    it('is the sorted union of languages across rows', () => {
      expect(
        languagesOf([{ en: ['a'] }, { de: ['b'], en: ['c'] }, { fr: ['d'] }]),
      ).toEqual(['de', 'en', 'fr']);
    });
  });
});
