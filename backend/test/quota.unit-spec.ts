import { brokenQuotaCodes, buildDesignState, deleteQuestion, designChanges } from '@qlarr/design-core';
import { EngineService } from '../src/engine/engine.service';
import { runChangeCode, runValidate } from '../src/engine/engine-runtime';
import {
  fullQuotaCodes,
  quotaDefinitions,
  fullQuotaValues,
  stripQuotaKeys,
  withComputedQuotaKeys,
} from '../src/modules/design/quota.helpers';
import { NavigationService } from '../src/modules/run/navigation.service';
import { nowUtcString } from '../src/common/datetime';

const quotaInstruction = (code: string, text: string) => ({
  code: `quota_${code}`,
  text,
  returnType: 'boolean',
  isActive: true,
});

describe('quota helpers', () => {
  it('reads quota definitions, skipping malformed ones and normalizing limits', () => {
    expect(
      quotaDefinitions({
        quotas: [
          { code: 'QT1', label: 'Male', limit: 50 },
          { code: 'QT2', limit: -3 },
          { code: 'bad code', limit: 5 },
          null,
          { label: 'no code', limit: 5 },
        ],
      }),
    ).toEqual([
      { code: 'QT1', label: 'Male', limit: 50 },
      { code: 'QT2', label: 'QT2', limit: 0 },
    ]);
    expect(quotaDefinitions({})).toEqual([]);
  });

  it('keeps only the first quota of a repeated code', () => {
    expect(
      quotaDefinitions({
        quotas: [
          { code: 'QT1', label: 'Men', limit: 50 },
          { code: 'QT1', label: 'Women', limit: 10 },
          { code: 'QT2', label: 'Other', limit: 5 },
        ],
      }),
    ).toEqual([
      { code: 'QT1', label: 'Men', limit: 50 },
      { code: 'QT2', label: 'Other', limit: 5 },
    ]);
  });

  it('only reports enforced quotas that reached their limit', () => {
    const definitions = [
      { code: 'QT1', label: 'a', limit: 2 },
      { code: 'QT2', label: 'b', limit: 3 },
      { code: 'QT3', label: 'c', limit: 0 },
    ];
    expect(fullQuotaCodes(definitions, { QT1: 2, QT2: 2, QT3: 100 })).toEqual(['QT1']);
  });

  it('strips engine-owned quota keys from client values', () => {
    expect(
      stripQuotaKeys({
        'Q1.value': 'male',
        'Survey.quota_QT1': true,
        'Survey.quota_QT1_full': false,
        'Survey.var_custom': true,
        'Survey.lang': 'en',
      }),
    ).toEqual({ 'Q1.value': 'male', 'Survey.lang': 'en' });
  });

  it('marks full quotas as engine input values', () => {
    expect(fullQuotaValues(['QT1', 'QT2'])).toEqual({
      'Survey.quota_QT1_full': true,
      'Survey.quota_QT2_full': true,
    });
  });

  it('takes quota membership from the engine and keeps everything else', () => {
    expect(
      withComputedQuotaKeys(
        {
          'Q1.value': 'male',
          'Survey.quota_QT1': false,
          'Survey.quota_FAKE': true,
          'Survey.disqualified': true,
          'Survey.screened_out_by_quota': 'QT1',
        },
        { 'Q1.value': 'ignored', 'Survey.quota_QT1': true, 'Survey.disqualified': false },
      ),
    ).toEqual({
      'Q1.value': 'male',
      'Survey.disqualified': true,
      'Survey.screened_out_by_quota': 'QT1',
      'Survey.quota_QT1': true,
    });
  });
});

describe('quota engine binding', () => {
  const engine = new EngineService();
  const design = (disqualifyOnQ1?: string) => {
    const survey = JSON.parse(engine.newSurvey('Quotas'));
    survey.groups[0].questions = [
      {
        code: 'Q1',
        type: 'text',
        instructionList: [
          { code: 'value', text: '', returnType: 'string', isActive: false },
          ...(disqualifyOnQ1
            ? [
                {
                  code: 'skip_to_G2',
                  skipToComponent: 'G2',
                  toEnd: false,
                  disqualify: true,
                  text: disqualifyOnQ1,
                  returnType: 'boolean',
                  isActive: true,
                },
              ]
            : []),
        ],
      },
    ];
    survey.quotas = [
      {
        code: 'QT1',
        label: 'Male',
        limit: 1,
        condition: { logic: { '==': [{ var: 'Q1.value' }, 'male'] } },
      },
    ];
    survey.instructionList = [quotaInstruction('QT1', 'Q1.value == "male"')];
    return survey;
  };
  const processed = runValidate(JSON.stringify(design()));
  const processedSurvey = JSON.stringify(processed);

  const next = (
    fullQuotas: string[],
    extra: Record<string, unknown> = {},
    survey: string = processedSurvey,
  ) =>
    engine.navigate({
      values: JSON.stringify({ 'Q1.value': 'male', ...fullQuotaValues(fullQuotas), ...extra }),
      processedSurvey: survey,
      lang: null,
      navigationMode: 'GROUP_BY_GROUP',
      navigationIndex: { name: 'group', groupId: 'G1' },
      navigationDirection: { name: 'NEXT' },
      skipInvalid: true,
      surveyMode: 'ONLINE',
    });

  it('validates the quota and its full input without errors', () => {
    const survey = processed.survey as {
      instructionList: { errors?: unknown[] }[];
      groups: { questions: { instructionList: { errors?: unknown[] }[] }[] }[];
    };
    const instructions = [
      ...survey.instructionList,
      ...survey.groups[0].questions[0].instructionList,
    ];
    expect(instructions.filter((instruction) => instruction.errors?.length)).toEqual([]);
  });

  it('screens a respondent matching a full quota out to the end, disqualified', async () => {
    const out = await next(['QT1']);
    expect(out.navigationIndex.name).toBe('end');
    expect(out.toSave['Survey.disqualified']).toBe(true);
    expect(out.toSave['Survey.quota_QT1']).toBe(true);
    expect(out.toSave['Survey.quota_QT1_full']).toBeUndefined();
    expect(out.toSave['Survey.screened_out_by_quota']).toBe('QT1');
  });

  it('does not report a quota when a disqualifying skip ended the survey', async () => {
    const withSkip = JSON.stringify(runValidate(JSON.stringify(design('Q1.value == "male"'))));
    expect((await next([], {}, withSkip)).toSave['Survey.disqualified']).toBe(true);
    const out = await next(['QT1'], {}, withSkip);
    expect(out.navigationIndex.name).toBe('end');
    expect(out.toSave['Survey.disqualified']).toBe(true);
    expect(out.toSave['Survey.quota_QT1']).toBe(true);
    expect(out.toSave['Survey.screened_out_by_quota']).toBeUndefined();
  });

  it('only treats a JSON boolean true as full', async () => {
    const out = await next([], { 'Survey.quota_QT1_full': 'true' });
    expect(out.toSave['Survey.disqualified']).toBe(false);
  });

  it('lets a respondent matching an open quota through, saving membership', async () => {
    const out = await next([]);
    expect(out.navigationIndex.name).toBe('end');
    expect(out.toSave['Survey.disqualified']).toBe(false);
    expect(out.toSave['Survey.quota_QT1']).toBe(true);
    expect(out.toSave['Survey.passed_quotas']).toBeUndefined();
    expect(out.toSave['Survey.screened_out_by_quota']).toBeUndefined();
  });

  it('renames question codes inside quota conditions and compiled instructions', () => {
    const result = runChangeCode(processedSurvey, 'Q1', 'Qgender');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const survey = result.output.survey as {
      quotas: { condition: unknown }[];
      instructionList: { code: string; text: string }[];
    };
    expect(JSON.stringify(survey.quotas[0].condition)).toContain('Qgender.value');
    expect(survey.instructionList.find((i) => i.code === 'quota_QT1')?.text).toBe(
      'Qgender.value == "male"',
    );
  });
});

describe('quota on a deleted question', () => {
  const engine = new EngineService();
  const textQuestion = (code: string) => ({
    code,
    type: 'text',
    instructionList: [{ code: 'value', text: '', returnType: 'string', isActive: false }],
  });
  const survey = JSON.parse(engine.newSurvey('Deleted question'));
  survey.groups[0].questions = [textQuestion('Q1'), textQuestion('Q2')];
  survey.quotas = [
    { code: 'QT1', label: 'Q2 is x', limit: 1, condition: { logic: { '==': [{ var: 'Q2' }, 'x'] } } },
  ];
  survey.instructionList = [quotaInstruction('QT1', 'Q2.value == "x"')];
  const processed = runValidate(JSON.stringify(survey));

  const next = (processedSurvey: unknown, values: Record<string, unknown>) =>
    engine.navigate({
      values: JSON.stringify({ ...values, ...fullQuotaValues(['QT1']) }),
      processedSurvey: JSON.stringify(processedSurvey),
      lang: null,
      navigationMode: 'GROUP_BY_GROUP',
      navigationIndex: { name: 'group', groupId: 'G1' },
      navigationDirection: { name: 'NEXT' },
      skipInvalid: true,
      surveyMode: 'ONLINE',
    });

  // The designer's save: delete in design-core, send the diff, let the engine process it.
  const deleteAndSave = async (questionCode: string) => {
    const state = buildDesignState({}, { designerInput: engine.toDesignerInput(processed), versionDto: {} });
    deleteQuestion(state, questionCode);
    return engine.process(designChanges(state, state.latest), processed.survey);
  };

  it('screens out on its question before the question is deleted', async () => {
    const out = await next(processed, { 'Q2.value': 'x' });
    expect(out.toSave['Survey.screened_out_by_quota']).toBe('QT1');
  });

  it('is invalid once its question is deleted', async () => {
    const saved = await deleteAndSave('Q2');
    const instruction = (saved.survey as { instructionList: { code: string; errors?: unknown[] }[] })
      .instructionList.find((i) => i.code === 'quota_QT1');
    expect(instruction?.errors?.length).toBeGreaterThan(0);
    expect([...brokenQuotaCodes(engine.toDesignerInput(saved).state)]).toEqual(['QT1']);
  });

  it('stops working once its question is deleted: no screen-out, no membership', async () => {
    const saved = await deleteAndSave('Q2');
    const out = await next(saved, { 'Q1.value': 'anything' });
    expect(out.navigationIndex.name).toBe('end');
    expect(out.toSave['Survey.disqualified']).toBe(false);
    expect(out.toSave['Survey.screened_out_by_quota']).toBeUndefined();
    expect(out.toSave['Survey.quota_QT1']).toBeUndefined();
  });

  it('stays valid when a different question is deleted', async () => {
    const saved = await deleteAndSave('Q1');
    expect(brokenQuotaCodes(engine.toDesignerInput(saved).state).size).toBe(0);
    const out = await next(saved, { 'Q2.value': 'x' });
    expect(out.toSave['Survey.screened_out_by_quota']).toBe('QT1');
  });
});

describe('navigation quota enforcement', () => {
  const survey = {
    id: 's',
    status: 'ACTIVE',
    startDate: null,
    endDate: null,
    quota: -1,
    navigationData: {
      allowJump: true,
      allowPrevious: true,
      allowIncomplete: true,
      skipInvalid: true,
      navigationMode: 'GROUP_BY_GROUP',
    },
  };
  const processed = {
    survey,
    version: { valid: true },
    output: { schema: [], survey: { defaultLang: { code: 'en', name: 'English' } } },
  };

  const setup = () => {
    const engineNavigate = jest.fn().mockResolvedValue({
      navigationIndex: { name: 'end' },
      toSave: {
        'Survey.disqualified': true,
        'Survey.quota_QT1': true,
        'Survey.screened_out_by_quota': 'QT1',
      },
    });
    const fullQuotas = jest.fn().mockResolvedValue(['QT1']);
    const svc = new NavigationService(
      { completedCount: jest.fn().mockResolvedValue(0) } as any,
      { navigate: engineNavigate } as any,
      { fullQuotas } as any,
    );
    return { svc, engineNavigate, fullQuotas };
  };

  it('passes full quotas to the engine as values and ignores quota keys sent by the client', async () => {
    const { svc, engineNavigate } = setup();
    const result = await svc.navigate({
      surveyId: 's',
      response: {
        values: { 'Q1.value': 'female' },
        navigationIndex: { name: 'group', groupId: 'G1' },
        lang: 'en',
        startDate: nowUtcString(),
      },
      processedSurvey: processed,
      navigationDirection: { name: 'NEXT' },
      values: { 'Q1.value': 'male', 'Survey.quota_QT1': false, 'Survey.quota_QT1_full': false },
      preview: false,
      surveyMode: 'ONLINE',
    } as any);

    const params = engineNavigate.mock.calls[0][0];
    expect(JSON.parse(params.values)).toEqual({
      'Q1.value': 'male',
      'Survey.quota_QT1_full': true,
    });
    expect(result.screenedOutQuota).toBe('QT1');
  });

  it('keeps a screened-out response disqualified and its quota when it is resumed', async () => {
    const { svc, engineNavigate } = setup();
    engineNavigate.mockResolvedValue({
      navigationIndex: { name: 'end' },
      toSave: { 'Survey.disqualified': false, 'Survey.quota_QT1': true },
    });
    const result = await svc.navigate({
      surveyId: 's',
      response: {
        values: {
          'Q1.value': 'male',
          'Survey.disqualified': true,
          'Survey.quota_QT1': true,
          'Survey.screened_out_by_quota': 'QT1',
        },
        navigationIndex: { name: 'end' },
        lang: 'en',
        startDate: nowUtcString(),
      },
      processedSurvey: processed,
      navigationDirection: { name: 'RESUME' },
      values: { 'Survey.disqualified': false },
      preview: false,
      surveyMode: 'ONLINE',
    } as any);

    expect(result.navigationJsonOutput.toSave['Survey.disqualified']).toBe(true);
    expect(result.navigationJsonOutput.toSave['Survey.screened_out_by_quota']).toBe('QT1');
    expect(result.screenedOutQuota).toBe('QT1');
  });

  it('does not name a quota the engine did not report', async () => {
    const { svc, engineNavigate } = setup();
    engineNavigate.mockResolvedValue({
      navigationIndex: { name: 'end' },
      toSave: { 'Survey.disqualified': true, 'Survey.quota_QT1': true },
    });
    const result = await svc.navigate({
      surveyId: 's',
      response: {
        values: { 'Q1.value': 'male' },
        navigationIndex: { name: 'group', groupId: 'G1' },
        lang: 'en',
        startDate: nowUtcString(),
      },
      processedSurvey: processed,
      navigationDirection: { name: 'NEXT' },
      values: { 'Q1.value': 'male', 'Survey.screened_out_by_quota': 'QT1' },
      preview: false,
      surveyMode: 'ONLINE',
    } as any);

    expect(result.screenedOutQuota).toBeNull();
  });

  it('does not enforce quotas in preview', async () => {
    const { svc, engineNavigate, fullQuotas } = setup();
    await svc.navigate({
      surveyId: 's',
      response: null,
      processedSurvey: processed,
      navigationDirection: { name: 'START' },
      values: {},
      preview: true,
      surveyMode: 'ONLINE',
    } as any);

    expect(fullQuotas).not.toHaveBeenCalled();
    expect(JSON.parse(engineNavigate.mock.calls[0][0].values)).toEqual({});
  });
});
