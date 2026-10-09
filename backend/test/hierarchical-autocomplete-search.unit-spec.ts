import {
  findRow,
  searchLang,
  searchLevel,
} from '../src/modules/surveys/hierarchical-autocomplete-search';
import { HierarchicalRow } from '../src/modules/surveys/hierarchical-autocomplete-csv';
import { AutoCompleteService } from '../src/modules/surveys/autocomplete.service';
import { AutoCompleteRepository } from '../src/modules/surveys/autocomplete.repository';
import { DesignService } from '../src/modules/design/design.service';
import { FileHelper } from '../src/integrations/filesystem/file-helper';

const ROWS: HierarchicalRow[] = [
  { en: ['Germany', 'Bavaria', 'Munich'], de: ['Deutschland', 'Bayern', 'München'] },
  { en: ['Germany', 'Bavaria', 'Nuremberg'], de: ['Deutschland', 'Bayern', 'Nürnberg'] },
  { en: ['Germany', 'Berlin', 'Berlin'], de: ['Deutschland', 'Berlin', 'Berlin'] },
  { en: ['France', 'Brittany', 'Brest'] }, // no German
];

describe('hierarchical-autocomplete search', () => {
  describe('searchLang', () => {
    it('uses the respondent language when any row carries it', () => {
      expect(searchLang(ROWS, 'de', 'en')).toBe('de');
    });

    it('falls back to the default language when no row carries it', () => {
      expect(searchLang(ROWS, 'fr', 'en')).toBe('en');
    });
  });

  describe('searchLevel', () => {
    it('returns distinct, sorted values for the first level', () => {
      expect(searchLevel(ROWS, 'en', 0, [], 'r', 10)).toEqual([
        'France',
        'Germany',
      ]);
    });

    it('filters by the levels above', () => {
      expect(searchLevel(ROWS, 'en', 1, ['Germany'], 'b', 10)).toEqual([
        'Bavaria',
        'Berlin',
      ]);
      expect(
        searchLevel(ROWS, 'en', 2, ['Germany', 'Bavaria'], 'u', 10),
      ).toEqual(['Munich', 'Nuremberg']);
    });

    it('matches a case-insensitive substring', () => {
      expect(searchLevel(ROWS, 'en', 2, ['Germany', 'Bavaria'], 'NICH', 10)).toEqual([
        'Munich',
      ]);
    });

    it('searches in the given language', () => {
      expect(searchLevel(ROWS, 'de', 2, ['Deutschland', 'Bayern'], 'ü', 10)).toEqual([
        'München',
        'Nürnberg',
      ]);
    });

    it('leaves out rows that lack the language', () => {
      expect(searchLevel(ROWS, 'de', 0, [], 'a', 10)).toEqual(['Deutschland']);
    });

    it('caps the result at the limit', () => {
      expect(searchLevel(ROWS, 'en', 0, [], 'a', 1)).toEqual(['France']);
    });
  });

  describe('findRow', () => {
    it('finds the whole row by its full path in the given language', () => {
      expect(findRow(ROWS, 'de', ['Deutschland', 'Bayern', 'München'])).toBe(
        ROWS[0],
      );
    });

    it('returns null for an unknown or partial path', () => {
      expect(findRow(ROWS, 'en', ['Germany', 'Bavaria', 'Augsburg'])).toBeNull();
      expect(findRow(ROWS, 'en', ['Germany', 'Bavaria'])).toBeNull();
    });
  });
});

describe('AutoCompleteService hierarchical respondent lookups', () => {
  const make = () => {
    const autoComplete = {
      getHierarchicalDataByFilename: jest.fn().mockResolvedValue(ROWS),
    };
    const service = new AutoCompleteService(
      autoComplete as unknown as AutoCompleteRepository,
      {} as DesignService,
      {} as FileHelper,
    );
    return { service, autoComplete };
  };

  it('searches by filename, in the default language when the respondent language has no data', async () => {
    const { service, autoComplete } = make();
    await expect(
      service.searchHierarchical('s1', 'f.json', 1, ['Germany'], '', 'fr', 'en', 10),
    ).resolves.toEqual(['Bavaria', 'Berlin']);
    expect(autoComplete.getHierarchicalDataByFilename).toHaveBeenCalledWith(
      's1',
      'f.json',
    );
  });

  it('resolves the whole row for a path in the respondent language', async () => {
    const { service } = make();
    await expect(
      service.hierarchicalRow('s1', 'f.json', ['Deutschland', 'Berlin', 'Berlin'], 'de', 'en'),
    ).resolves.toEqual(ROWS[2]);
  });

  it('resolves the whole row from the stored default-language values', async () => {
    const { service } = make();
    await expect(
      service.hierarchicalRow('s1', 'f.json', ['Germany', 'Bavaria', 'Munich'], 'en', 'en'),
    ).resolves.toEqual(ROWS[0]);
  });

  it('returns null when the path matches no row', async () => {
    const { service } = make();
    await expect(
      service.hierarchicalRow('s1', 'f.json', ['Nowhere'], 'en', 'en'),
    ).resolves.toBeNull();
  });
});
