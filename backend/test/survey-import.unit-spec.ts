import { SurveysService } from '../src/modules/surveys/surveys.service';

/**
 * Unit test for importSurvey's partial-failure rollback: when the upload step
 * fails after the survey/version rows are written, the survey row must be
 * cascade-deleted too (not just the files) — else a ghost DRAFT is orphaned in
 * the surveys table. Collaborators are stubbed.
 */
describe('SurveysService.importSurvey — rollback on partial failure', () => {
  const simpleSurvey = {
    name: 'Imported',
    startDate: null,
    endDate: null,
    usage: 'mixed',
    image: null,
    description: null,
    navigationData: null,
    saveIp: true,
    saveTimings: true,
    backgroundAudio: false,
    recordGps: false,
    latestVersion: { valid: true },
  };
  const surveyJson = JSON.stringify({
    survey: simpleSurvey,
    autoCompleteResources: [],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeService = (filesOverride: Record<string, any> = {}) => {
    const surveys = {
      allNames: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: unknown) => data),
      save: jest.fn().mockResolvedValue(undefined),
      deleteCascade: jest.fn().mockResolvedValue(undefined),
    };
    const versions = { save: jest.fn().mockResolvedValue(undefined) };
    const files = {
      extractImportZip: jest.fn().mockResolvedValue({
        surveyJson,
        designFile: Buffer.from('{}'),
        resources: [],
      }),
      uploadImportedSurvey: jest.fn().mockResolvedValue(undefined),
      deleteSurveyFiles: jest.fn().mockResolvedValue(undefined),
      ...filesOverride,
    };

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const service = new SurveysService(
      surveys as any,
      versions as any,
      {} as any, // autoComplete (unused before the failure point)
      {} as any, // engine
      {} as any, // design
      files as any,
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return { service, surveys, files };
  };

  it('cascade-deletes the just-created survey row when the upload step fails', async () => {
    const boom = new Error('storage down');
    const { service, surveys, files } = makeService({
      uploadImportedSurvey: jest.fn().mockRejectedValue(boom),
    });

    await expect(service.importSurvey(Buffer.from('zip'))).rejects.toThrow(boom);

    expect(surveys.deleteCascade).toHaveBeenCalledTimes(1);
    const id = surveys.deleteCascade.mock.calls[0][0] as string;
    // The rollback targets the same survey across both the rows and the files.
    expect(files.deleteSurveyFiles).toHaveBeenCalledWith(id);
  });

  it('does not roll back on a successful import', async () => {
    const { service, surveys } = makeService();

    const dto = await service.importSurvey(Buffer.from('zip'));

    expect(dto.id).toBeDefined();
    expect(surveys.deleteCascade).not.toHaveBeenCalled();
  });
});
