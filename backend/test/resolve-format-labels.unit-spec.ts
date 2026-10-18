import { resolveFormatInstructionLabels } from '../src/modules/responses/analytics.service';

type Responses = Array<Record<string, unknown>>;

// Resolve a single label through the in-place pass and return the result.
function resolve(
  label: string,
  code: string,
  responses: Responses,
  defaultLang = 'en',
): string {
  const labels = { [code]: label };
  resolveFormatInstructionLabels(labels, responses, defaultLang);
  return labels[code];
}

describe('resolveFormatInstructionLabels', () => {
  it('leaves labels without a format instruction untouched', () => {
    expect(resolve('What brands are you aware of?', 'Q1', [])).toBe(
      'What brands are you aware of?',
    );
  });

  it('collapses a standalone "other" free-text ref to the literal "Other"', () => {
    // The RANKING "other" option label — no aggregate value is meaningful.
    expect(
      resolve('{{Q422ibyAotherAtext.value}}', 'Q119ojdAother', []),
    ).toBe('Other');
  });

  it('substitutes a value that is consistent across the response set', () => {
    // Every response that reached the `_1` repeat instance resolved the title to
    // the same design label ("Vodafone").
    const label =
      'How would you rank {{("$repeat_token" == "other") ? Q422ibyAotherAtext.value : Q422ibyA$repeat_token.label}}';
    const responses: Responses = [
      { 'Q602vrd_1.format_label_en_1': 'Vodafone' },
      { 'Q602vrd_1.format_label_en_1': 'Vodafone' },
    ];
    expect(resolve(label, 'Q602vrd_1', responses)).toBe(
      'How would you rank Vodafone',
    );
  });

  it('collapses a value that varies per respondent to {{...}}', () => {
    // The `_other` instance resolves to each respondent's own free text.
    const label = 'How would you rank {{...conditional...}}';
    const responses: Responses = [
      { 'Q602vrd_other.format_label_en_1': 'Telecom Egypt' },
      { 'Q602vrd_other.format_label_en_1': 'Orange' },
    ];
    expect(resolve(label, 'Q602vrd_other', responses)).toBe(
      'How would you rank {{...}}',
    );
  });

  it('collapses to {{...}} when no response carries the value', () => {
    // The empty base template: nobody ever rendered it.
    expect(resolve('How would you rank {{x}}', 'Q602vrd', [])).toBe(
      'How would you rank {{...}}',
    );
  });

  it('indexes placeholders by their original position, not post-collapse', () => {
    // Placeholder 1 is the "other" ref → "Other"; placeholder 2 must still be
    // looked up under `_2`, even though it is now the only surviving {{ }}.
    const label = '{{Q1AotherAtext.value}} - {{secondRef}}';
    const responses: Responses = [{ 'C.format_label_en_2': 'Quality' }];
    expect(resolve(label, 'C', responses)).toBe('Other - Quality');
  });

  it('prefers the default language for the consistency check', () => {
    const responses: Responses = [
      { 'C.format_label_en_1': 'Vodafone', 'C.format_label_ar_1': 'فودافون' },
    ];
    expect(resolve('rank {{x}}', 'C', responses, 'en')).toBe('rank Vodafone');
  });

  it('falls back to another single language only when the default carries none', () => {
    const responses: Responses = [
      { 'C.format_label_ar_1': 'فودافون' },
      { 'C.format_label_ar_1': 'فودافون' },
    ];
    expect(resolve('rank {{x}}', 'C', responses, 'en')).toBe('rank فودافون');
  });

  it('does NOT fall back when the default language is present but inconsistent', () => {
    const responses: Responses = [
      { 'C.format_label_en_1': 'Vodafone', 'C.format_label_ar_1': 'same' },
      { 'C.format_label_en_1': 'WE', 'C.format_label_ar_1': 'same' },
    ];
    // en is inconsistent → collapse, even though ar would be consistent.
    expect(resolve('rank {{x}}', 'C', responses, 'en')).toBe('rank {{...}}');
  });

  it('ignores empty/missing stored values when judging consistency', () => {
    const responses: Responses = [
      { 'C.format_label_en_1': '' },
      { 'C.format_label_en_1': 'Vodafone' },
      {},
    ];
    expect(resolve('rank {{x}}', 'C', responses, 'en')).toBe('rank Vodafone');
  });
});
