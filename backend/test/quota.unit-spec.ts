import { EngineService } from '../src/engine/engine.service';
import { runChangeCode, runValidate } from '../src/engine/engine-runtime';
import {
  fullQuotaCodes,
  quotaDefinitions,
  screenedOutQuota,
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
        'Survey.lang': 'en',
      }),
    ).toEqual({ 'Q1.value': 'male', 'Survey.lang': 'en' });
  });

  it('takes quota membership from the engine and keeps everything else', () => {
    expect(
      withComputedQuotaKeys(
        {
          'Q1.value': 'male',
          'Survey.quota_QT1': false,
          'Survey.quota_FAKE': true,
          'Survey.disqualified': true,
        },
        { 'Q1.value': 'ignored', 'Survey.quota_QT1': true, 'Survey.disqualified': false },
      ),
    ).toEqual({
      'Q1.value': 'male',
      'Survey.disqualified': true,
      'Survey.quota_QT1': true,
    });
  });

  it('names the first full quota the respondent belongs to when screened out', () => {
    const end = { name: 'end' };
    const toSave = {
      'Survey.disqualified': true,
      'Survey.quota_QT1': false,
      'Survey.quota_QT2': true,
      'Survey.quota_QT3': true,
    };
    expect(screenedOutQuota(['QT1', 'QT2', 'QT3'], end, toSave)).toBe('QT2');
    expect(screenedOutQuota(['QT1'], end, toSave)).toBeNull();
    expect(
      screenedOutQuota(['QT2'], end, { ...toSave, 'Survey.disqualified': false }),
    ).toBeNull();
    expect(screenedOutQuota(['QT2'], { name: 'group' }, toSave)).toBeNull();
  });
});

describe('quota engine binding', () => {
  const engine = new EngineService();
  const design = () => {
    const survey = JSON.parse(engine.newSurvey('Quotas'));
    survey.groups[0].questions = [
      {
        code: 'Q1',
        type: 'text',
        instructionList: [{ code: 'value', text: '', returnType: 'string', isActive: false }],
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
  const processedSurvey = JSON.stringify(runValidate(JSON.stringify(design())));

  const next = (fullQuotas: string[]) =>
    engine.navigate({
      values: JSON.stringify({ 'Q1.value': 'male' }),
      processedSurvey,
      lang: null,
      navigationMode: 'GROUP_BY_GROUP',
      navigationIndex: { name: 'group', groupId: 'G1' },
      navigationDirection: { name: 'NEXT' },
      skipInvalid: true,
      surveyMode: 'ONLINE',
      fullQuotas,
    });

  it('screens a respondent matching a full quota out to the end, disqualified', async () => {
    const out = await next(['QT1']);
    expect(out.navigationIndex.name).toBe('end');
    expect(out.toSave['Survey.disqualified']).toBe(true);
    expect(out.toSave['Survey.quota_QT1']).toBe(true);
    expect(screenedOutQuota(['QT1'], out.navigationIndex, out.toSave)).toBe('QT1');
  });

  it('lets a respondent matching an open quota through, saving membership', async () => {
    const out = await next([]);
    expect(out.navigationIndex.name).toBe('end');
    expect(out.toSave['Survey.disqualified']).toBe(false);
    expect(out.toSave['Survey.quota_QT1']).toBe(true);
    expect(out.toSave['Survey.passed_quotas']).toBeUndefined();
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
      toSave: { 'Survey.disqualified': true, 'Survey.quota_QT1': true },
    });
    const fullQuotas = jest.fn().mockResolvedValue(['QT1']);
    const svc = new NavigationService(
      { completedCount: jest.fn().mockResolvedValue(0) } as any,
      { navigate: engineNavigate } as any,
      { fullQuotas } as any,
    );
    return { svc, engineNavigate, fullQuotas };
  };

  it('passes full quotas to the engine and ignores quota keys sent by the client', async () => {
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
      values: { 'Q1.value': 'male', 'Survey.quota_QT1': false },
      preview: false,
      surveyMode: 'ONLINE',
    } as any);

    const params = engineNavigate.mock.calls[0][0];
    expect(params.fullQuotas).toEqual(['QT1']);
    expect(JSON.parse(params.values)).toEqual({ 'Q1.value': 'male' });
    expect(result.screenedOutQuota).toBe('QT1');
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
    expect(engineNavigate.mock.calls[0][0].fullQuotas).toEqual([]);
  });
});
