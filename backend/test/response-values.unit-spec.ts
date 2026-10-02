import {
  resolveListAndEnumValues,
  valueDataTypes,
} from '../src/modules/responses/response.service';

// labels keyed as the engine emits them: `<rootQuestion><answerCode>`. For an
// scq/mcq the root IS the question (`Q1A2`); for an array the columns live under
// the array root, not the row (`Q9Ac1`, NOT `Q9A1Ac1`).
const labels = {
  Q1A2: 'Option 2',
  Q1A3: 'Option 3',
  Q1Aother: 'Other',
  Q9Ac1: 'Agree',
  Q9Ac2: 'Disagree',
};

describe('resolveListAndEnumValues', () => {
  describe('enum (single choice)', () => {
    it('resolves an scq answer code to its label', () => {
      expect(resolveListAndEnumValues('A2', 'Q1', 'enum', labels)).toBe(
        'Option 2',
      );
    });

    it('resolves an array_scq column code against the array root', () => {
      // row Q9A1 stores column code "Ac1"; its label lives at Q9Ac1.
      expect(resolveListAndEnumValues('Ac1', 'Q9', 'enum', labels)).toBe(
        'Agree',
      );
    });

    it('falls back to the raw code when no label exists', () => {
      expect(resolveListAndEnumValues('Azzz', 'Q1', 'enum', labels)).toBe(
        'Azzz',
      );
    });

    it('handles the object dataType form ({ type: "enum" })', () => {
      expect(
        resolveListAndEnumValues('A2', 'Q1', { type: 'enum' }, labels),
      ).toBe('Option 2');
    });

    it('passes a non-string enum value through untouched', () => {
      expect(resolveListAndEnumValues(7, 'Q1', 'enum', labels)).toBe(7);
    });
  });

  describe('list (multiple choice)', () => {
    it('resolves every code and comma-joins the labels', () => {
      expect(
        resolveListAndEnumValues(['A2', 'A3', 'Aother'], 'Q1', 'list', labels),
      ).toBe('Option 2, Option 3, Other');
    });

    it('keeps unknown codes as-is within the joined list', () => {
      expect(
        resolveListAndEnumValues(['A2', 'Azzz'], 'Q1', 'list', labels),
      ).toBe('Option 2, Azzz');
    });

    it('passes a non-array list value through untouched', () => {
      expect(resolveListAndEnumValues('A2', 'Q1', 'list', labels)).toBe('A2');
    });
  });

  describe('non-choice data types', () => {
    it('returns the raw value for string/number/other types', () => {
      expect(resolveListAndEnumValues('free text', 'Q1', 'string', labels)).toBe(
        'free text',
      );
      expect(resolveListAndEnumValues(42, 'Q1', 'double', labels)).toBe(42);
      expect(resolveListAndEnumValues(false, 'Q1', 'boolean', labels)).toBe(
        false,
      );
    });

    it('returns the raw value when the dataType is unknown', () => {
      expect(resolveListAndEnumValues('x', 'Q1', undefined, labels)).toBe('x');
    });
  });
});

describe('valueDataTypes', () => {
  it('maps componentCode → dataType for VALUE fields only', () => {
    const schema = [
      { componentCode: 'Q1', columnName: 'VALUE', dataType: 'list' },
      { componentCode: 'Q1', columnName: 'ORDER', dataType: 'int' },
      { componentCode: 'Q9A1', columnName: 'VALUE', dataType: { type: 'enum' } },
      { componentCode: 'Q9A1', columnName: 'PRIORITY', dataType: 'int' },
    ];
    expect(valueDataTypes(schema)).toEqual({
      Q1: 'list',
      Q9A1: { type: 'enum' },
    });
  });

  it('returns an empty map when there are no VALUE fields', () => {
    expect(
      valueDataTypes([{ componentCode: 'Q1', columnName: 'ORDER', dataType: 'int' }]),
    ).toEqual({});
  });
});
