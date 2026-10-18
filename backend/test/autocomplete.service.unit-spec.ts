import { AutoCompleteService } from '../src/modules/surveys/autocomplete.service';
import { AutoCompleteRepository } from '../src/modules/surveys/autocomplete.repository';
import { DesignService } from '../src/modules/design/design.service';
import { FileHelper } from '../src/integrations/filesystem/file-helper';
import { SurveyFolder } from '../src/integrations/filesystem/survey-folder';
import {
  HierarchicalAutoCompleteMalformedInputException,
  SurveyIsClosedException,
  SurveyNotFoundException,
} from '../src/modules/surveys/survey.exceptions';

const SURVEY = 'survey-1';
const COMPONENT = 'Q1';

/** Build the service over fresh jest mocks; returns the service + the mocks. */
function make() {
  const autoComplete = {
    surveyExists: jest.fn(),
    getData: jest.fn(),
    getHierarchicalData: jest.fn(),
    findFilename: jest.fn(),
    replace: jest.fn().mockResolvedValue(undefined),
    search: jest.fn(),
  };
  const designs = { getProcessedSurvey: jest.fn() };
  const files = {
    upload: jest.fn().mockResolvedValue('new-file.json'),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AutoCompleteService(
    autoComplete as unknown as AutoCompleteRepository,
    designs as unknown as DesignService,
    files as unknown as FileHelper,
  );
  return { service, autoComplete, designs, files };
}

/** A processed survey with the given status and languages (default first). */
const processed = (status: string, langs = ['en', 'de']) => ({
  survey: { status },
  output: {
    survey: {
      defaultLang: { code: langs[0] },
      additionalLang: langs.slice(1).map((code) => ({ code })),
    },
  },
});

const file = (text: string) => ({
  size: Buffer.byteLength(text),
  buffer: Buffer.from(text, 'utf8'),
});

describe('AutoCompleteService', () => {
  describe('getAutoCompleteValues', () => {
    it('returns the stored values when the survey exists', async () => {
      const { service, autoComplete } = make();
      autoComplete.surveyExists.mockResolvedValue(true);
      autoComplete.getData.mockResolvedValue(['a', 'b']);
      await expect(
        service.getAutoCompleteValues(SURVEY, COMPONENT),
      ).resolves.toEqual(['a', 'b']);
    });

    it('throws when the survey does not exist', async () => {
      const { service, autoComplete } = make();
      autoComplete.surveyExists.mockResolvedValue(false);
      await expect(
        service.getAutoCompleteValues(SURVEY, COMPONENT),
      ).rejects.toThrow(SurveyNotFoundException);
      expect(autoComplete.getData).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('delegates to the repository', async () => {
      const { service, autoComplete } = make();
      autoComplete.search.mockResolvedValue(['x']);
      await expect(service.search(SURVEY, 'f.json', 'q', 10)).resolves.toEqual([
        'x',
      ]);
      expect(autoComplete.search).toHaveBeenCalledWith(SURVEY, 'f.json', 'q', 10);
    });
  });

  describe('getHierarchicalCsv', () => {
    it('serializes the stored rows to the full-matrix CSV', async () => {
      const { service, autoComplete } = make();
      autoComplete.surveyExists.mockResolvedValue(true);
      autoComplete.getHierarchicalData.mockResolvedValue([
        { en: ['Germany', 'Bavaria', 'Munich'] },
      ]);
      const csv = await service.getHierarchicalCsv(
        SURVEY,
        COMPONENT,
        ['en', 'de'],
        ['Country', 'City', 'District'],
      );
      expect(csv).toContain(
        '"Country (en)","City (en)","District (en)","Country (de)","City (de)","District (de)"',
      );
      expect(csv).toContain('"Germany","Bavaria","Munich","","",""');
    });

    it('throws when the survey does not exist', async () => {
      const { service, autoComplete } = make();
      autoComplete.surveyExists.mockResolvedValue(false);
      await expect(
        service.getHierarchicalCsv(SURVEY, COMPONENT, ['en'], ['Country']),
      ).rejects.toThrow(SurveyNotFoundException);
    });
  });

  describe('uploadHierarchical', () => {
    const open = (autoComplete: any, designs: any) => {
      designs.getProcessedSurvey.mockResolvedValue(processed('ACTIVE'));
      autoComplete.getHierarchicalData.mockResolvedValue([]);
      autoComplete.findFilename.mockResolvedValue(null);
    };

    it('rejects an empty file before touching the survey', async () => {
      const { service, designs } = make();
      await expect(
        service.uploadHierarchical(SURVEY, COMPONENT, 3, {
          size: 0,
          buffer: Buffer.alloc(0),
        }),
      ).rejects.toThrow(HierarchicalAutoCompleteMalformedInputException);
      expect(designs.getProcessedSurvey).not.toHaveBeenCalled();
    });

    it('throws when the survey is missing', async () => {
      const { service, designs } = make();
      designs.getProcessedSurvey.mockRejectedValue(new SurveyNotFoundException());
      await expect(
        service.uploadHierarchical(SURVEY, COMPONENT, 3, file('L1 (en),L2 (en),L3 (en)\nA,B,C')),
      ).rejects.toThrow(SurveyNotFoundException);
    });

    it('throws when the survey is closed', async () => {
      const { service, designs } = make();
      designs.getProcessedSurvey.mockResolvedValue(processed('CLOSED'));
      await expect(
        service.uploadHierarchical(SURVEY, COMPONENT, 3, file('L1 (en),L2 (en),L3 (en)\nA,B,C')),
      ).rejects.toThrow(SurveyIsClosedException);
    });

    it('stores the uploaded data as JSON, swaps the row, and reports imports', async () => {
      const { service, autoComplete, designs, files } = make();
      open(autoComplete, designs);

      const info = await service.uploadHierarchical(
        SURVEY,
        COMPONENT,
        3,
        file('L1 (en),L2 (en),L3 (en)\nGermany,Bavaria,Munich'),
      );

      // Stored file is the canonical JSON array of per-language objects.
      const [, folder, body, contentType] = files.upload.mock.calls[0];
      expect(folder).toBe(SurveyFolder.Resources);
      expect(contentType).toBe('application/json');
      expect(JSON.parse((body as Buffer).toString('utf8'))).toEqual([
        { en: ['Germany', 'Bavaria', 'Munich'] },
      ]);

      // Row swapped with the same serialized payload + the saved filename.
      expect(autoComplete.replace).toHaveBeenCalledWith(
        SURVEY,
        COMPONENT,
        JSON.stringify([{ en: ['Germany', 'Bavaria', 'Munich'] }]),
        'new-file.json',
      );
      expect(files.delete).not.toHaveBeenCalled();

      expect(info).toMatchObject({
        name: 'new-file.json',
        rowCount: 1,
        levels: 3,
        languages: ['en'],
        imported: ['en'],
      });
      expect(info.lastModified).toEqual(expect.any(String));
    });

    it('replaces the stored data instead of merging into it', async () => {
      const { service, autoComplete, designs } = make();
      designs.getProcessedSurvey.mockResolvedValue(processed('ACTIVE'));
      autoComplete.findFilename.mockResolvedValue(null);
      autoComplete.getHierarchicalData.mockResolvedValue([
        { en: ['Germany', 'Bavaria', 'Munich'] },
        { en: ['France', 'IDF', 'Paris'] },
      ]);

      const info = await service.uploadHierarchical(
        SURVEY,
        COMPONENT,
        3,
        file(
          'L1 (en),L2 (en),L3 (en),L1 (de),L2 (de),L3 (de)\n' +
            'Germany,Bavaria,Munich,Deutschland,Bayern,München',
        ),
      );

      const stored = JSON.parse(autoComplete.replace.mock.calls[0][2]);
      expect(stored).toEqual([
        {
          en: ['Germany', 'Bavaria', 'Munich'],
          de: ['Deutschland', 'Bayern', 'München'],
        },
      ]);
      expect(autoComplete.getHierarchicalData).not.toHaveBeenCalled();
      expect(info).toMatchObject({
        rowCount: 1,
        languages: ['de', 'en'],
        imported: ['en', 'de'],
      });
    });

    it('silently ignores columns for languages the survey does not have', async () => {
      const { service, autoComplete, designs } = make();
      open(autoComplete, designs);
      designs.getProcessedSurvey.mockResolvedValue(processed('ACTIVE', ['en']));

      const info = await service.uploadHierarchical(
        SURVEY,
        COMPONENT,
        3,
        file(
          'L1 (en),L2 (en),L3 (en),L1 (fr),L2 (fr),L3 (fr)\n' +
            'Germany,Bavaria,Munich,Allemagne,Bavière,Munich',
        ),
      );

      expect(JSON.parse(autoComplete.replace.mock.calls[0][2])).toEqual([
        { en: ['Germany', 'Bavaria', 'Munich'] },
      ]);
      expect(info).toMatchObject({ languages: ['en'], imported: ['en'] });
    });

    it('deletes the previous stored file after a successful swap', async () => {
      const { service, autoComplete, designs, files } = make();
      open(autoComplete, designs);
      autoComplete.findFilename.mockResolvedValue('old-file.json');

      await service.uploadHierarchical(
        SURVEY,
        COMPONENT,
        3,
        file('L1 (en),L2 (en),L3 (en)\nGermany,Bavaria,Munich'),
      );

      expect(files.delete).toHaveBeenCalledWith(
        SURVEY,
        SurveyFolder.Resources,
        'old-file.json',
      );
    });

    it('surfaces malformed CSV (wrong column count) from the parser', async () => {
      const { service, autoComplete, designs } = make();
      open(autoComplete, designs);
      await expect(
        service.uploadHierarchical(
          SURVEY,
          COMPONENT,
          3,
          file('L1 (en),L2 (en),L3 (en)\nA,B'),
        ),
      ).rejects.toThrow(HierarchicalAutoCompleteMalformedInputException);
      expect(autoComplete.replace).not.toHaveBeenCalled();
    });
  });
});
