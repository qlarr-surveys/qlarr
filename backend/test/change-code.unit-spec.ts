import {
  renameCodeRefs,
  runChangeCode,
  runValidate,
} from '../src/engine/engine-runtime';

/**
 * `change_code` rewrites code references inside the designer's JSON rules
 * (relevance logic, skip rules, quota conditions). Only whole codes may be
 * renamed: renaming Q1 must leave Q10 alone but still reach Q1's answers (Q1A2).
 */

type Node = Record<string, any>;

const scq = (code: string, extra: Node = {}): Node => ({
  code,
  type: 'scq',
  answers: [
    { code: 'A1', type: 'option' },
    { code: 'A2', type: 'option' },
  ],
  instructionList: [{ code: 'value', text: '', returnType: 'string', isActive: false }],
  ...extra,
});

/** An scq with skip rules (`[answer, destination]`) plus their compiled instructions. */
const skipping = (code: string, rules: [string, string][]): Node =>
  scq(code, {
    skip_logic: rules.map(([answer, skipTo]) => ({ condition: [answer], skipTo })),
    instructionList: [
      { code: 'value', text: '', returnType: 'string', isActive: false },
      ...rules.map(([answer, skipTo], i) => ({
        code: `skip_to_auto${i + 1}`,
        text: `["${answer}"].includes(${code}.value)`,
        returnType: 'boolean',
        isActive: true,
        skipToComponent: skipTo,
        toEnd: false,
        disqualify: false,
      })),
    ],
  });

// Q3's show-if condition references Q1, Q10, Q1's answer A2, and groups G1/G10.
const relevanceLogic = {
  and: [
    { '==': [{ var: 'Q1.value' }, 'A1'] },
    { '==': [{ var: 'Q10.value' }, 'A2'] },
    { var: 'Q1A2.relevance' },
    { var: 'G1.relevance' },
    { var: 'G10.relevance' },
  ],
};

const design = {
  code: 'Survey',
  groups: [
    { code: 'G2', groupType: 'GROUP', questions: [skipping('Q2', [['A1', 'G1'], ['A2', 'G10']])] },
    {
      code: 'G1',
      groupType: 'GROUP',
      questions: [skipping('Q0', [['A1', 'Q1'], ['A2', 'Q10']]), scq('Q1'), scq('Q10')],
    },
    { code: 'G10', groupType: 'GROUP', questions: [scq('Q4')] },
    {
      code: 'G3',
      groupType: 'GROUP',
      questions: [
        scq('Q3', {
          relevance: { rule: 'show_if', logic: relevanceLogic },
          instructionList: [
            { code: 'value', text: '', returnType: 'string', isActive: false },
            {
              code: 'conditional_relevance',
              text: 'Q1.value == "A1" && Q10.value == "A2" && Q1A2.relevance && G1.relevance && G10.relevance',
              returnType: 'boolean',
              isActive: true,
            },
          ],
        }),
      ],
    },
    { code: 'Gend', groupType: 'END' },
  ],
};

const validated = JSON.stringify(runValidate(JSON.stringify(design)));

function changeCode(from: string, to: string): Node {
  const result = runChangeCode(validated, from, to);
  if (!result.ok) throw new Error(`change_code rejected: ${result.reason}`);
  return result.output.survey as Node;
}

function question(survey: Node, code: string): Node {
  for (const group of survey.groups) {
    const q = (group.questions ?? []).find((c: Node) => c.code === code);
    if (q) return q;
  }
  throw new Error(`no question ${code}`);
}

const skipTargets = (q: Node) => q.skip_logic.map((r: Node) => r.skipTo);

describe('runChangeCode renames only exact component codes', () => {
  it('Q1 → Q9 rewrites Q1 and Q1A2 in relevance, not Q10', () => {
    const q3 = question(changeCode('Q1', 'Q9'), 'Q3');
    expect(q3.relevance.logic).toEqual({
      and: [
        { '==': [{ var: 'Q9.value' }, 'A1'] },
        { '==': [{ var: 'Q10.value' }, 'A2'] },
        { var: 'Q9A2.relevance' },
        { var: 'G1.relevance' },
        { var: 'G10.relevance' },
      ],
    });
  });

  it('Q1 → Q9 rewrites a skip to Q1, not a skip to Q10', () => {
    const survey = changeCode('Q1', 'Q9');
    expect(skipTargets(question(survey, 'Q0'))).toEqual(['Q9', 'Q10']);
    expect(skipTargets(question(survey, 'Q2'))).toEqual(['G1', 'G10']);
  });

  it('G1 → G9 rewrites G1 in relevance, not G10', () => {
    const q3 = question(changeCode('G1', 'G9'), 'Q3');
    expect(q3.relevance.logic).toEqual({
      and: [
        { '==': [{ var: 'Q1.value' }, 'A1'] },
        { '==': [{ var: 'Q10.value' }, 'A2'] },
        { var: 'Q1A2.relevance' },
        { var: 'G9.relevance' },
        { var: 'G10.relevance' },
      ],
    });
  });

  it('G1 → G9 rewrites a skip to G1, not a skip to G10', () => {
    const survey = changeCode('G1', 'G9');
    expect(skipTargets(question(survey, 'Q2'))).toEqual(['G9', 'G10']);
    expect(skipTargets(question(survey, 'Q0'))).toEqual(['Q1', 'Q10']);
  });
});

describe('renameCodeRefs', () => {
  // Quota conditions (`Survey.quotas[].condition`) are designer JSON logic
  // rewritten through the same helper.
  const quotaCondition = {
    logic: {
      or: [
        { '==': [{ var: 'Q1.value' }, 'A1'] },
        { '==': [{ var: 'Q10.value' }, 'A1'] },
        { var: 'Q1A2.value' },
        { in: ['G1', ['G1', 'G10']] },
      ],
    },
  };

  it('renames a question in a quota condition, leaving longer codes alone', () => {
    expect(renameCodeRefs(quotaCondition, 'Q1', 'Q9')).toEqual({
      logic: {
        or: [
          { '==': [{ var: 'Q9.value' }, 'A1'] },
          { '==': [{ var: 'Q10.value' }, 'A1'] },
          { var: 'Q9A2.value' },
          { in: ['G1', ['G1', 'G10']] },
        ],
      },
    });
  });

  it('renames a group in a quota condition, leaving G10 alone', () => {
    expect(renameCodeRefs(quotaCondition, 'G1', 'G9')).toEqual({
      logic: {
        or: [
          { '==': [{ var: 'Q1.value' }, 'A1'] },
          { '==': [{ var: 'Q10.value' }, 'A1'] },
          { var: 'Q1A2.value' },
          { in: ['G9', ['G9', 'G10']] },
        ],
      },
    });
  });

  it('matches whole codes only', () => {
    const rename = (s: string) => renameCodeRefs(s, 'Q1', 'Q9');
    expect(rename('Q1')).toBe('Q9');
    expect(rename('Q1.value && Q1A2.relevance')).toBe('Q9.value && Q9A2.relevance');
    expect(rename('Q10.value')).toBe('Q10.value');
    expect(rename('Q1_b.value')).toBe('Q1_b.value');
    expect(rename('Q1b.value')).toBe('Q1b.value');
    expect(rename('XQ1.value')).toBe('XQ1.value');
    expect(rename('_Q1')).toBe('_Q1');
  });

  it('renames object keys and leaves non-string values untouched', () => {
    expect(renameCodeRefs({ Q1: [1, true, null], Q10: 'Q1' }, 'Q1', 'Q9')).toEqual({
      Q9: [1, true, null],
      Q10: 'Q9',
    });
  });

  it('treats regex metacharacters in the code literally', () => {
    expect(renameCodeRefs('Qa.b QaXb', 'Qa.b', 'Qz')).toBe('Qz QaXb');
  });
});
