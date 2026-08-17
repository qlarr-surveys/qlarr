import { ResponseField } from '../src/engine/engine.types';
import { validateSchema } from '../src/modules/run/run.helpers';

/** Build a one-field schema keyed as `<code>.value`. */
const field = (dataType: unknown): ResponseField[] => [
  { componentCode: 'Q1', columnName: 'VALUE', dataType },
];
const ok = (dataType: unknown, value: unknown) =>
  expect(() => validateSchema({ 'Q1.value': value }, field(dataType))).not.toThrow();
const bad = (dataType: unknown, value: unknown) =>
  expect(() => validateSchema({ 'Q1.value': value }, field(dataType))).toThrow(
    /Wrong value type/,
  );

describe('validateSchema (respondent value typing)', () => {
  it('accepts matching runtime types', () => {
    ok('boolean', true);
    ok('string', 'hi');
    ok('date', '2024-01-01 00:00:00'); // Date is carried as a string
    ok('double', 3.5);
    ok('double', 4); // an integer is a valid number
    ok('int', 7);
    ok('list', ['A1', 'A2']);
    ok('file', { filename: 'a.png' });
    ok('map', { any: 'thing' });
    ok({ type: 'enum', values: ['A', 'B'] }, 'A'); // enum → string
    ok({ type: 'list', values: ['A', 'B'] }, ['A']); // parameterized list → array
  });

  it('rejects mismatched runtime types (→ WrongValueType)', () => {
    bad('string', { nested: [1, 2, 3] }); // the finding's Q1 case
    bad('int', false); // the finding's Q2 case
    bad('boolean', 'true');
    bad('double', 'NaN');
    bad('int', 3.5); // a non-integer number is not an int
    bad('list', { 0: 'A' }); // an object is not an array
    bad('file', ['not', 'an', 'object']);
    bad({ type: 'enum', values: ['A'] }, 42);
  });

  it('skips keys with no schema field, and null/absent values', () => {
    // Unknown key is ignored entirely.
    expect(() =>
      validateSchema({ 'Qx.value': { anything: true } }, field('string')),
    ).not.toThrow();
    // A null value is not type-checked.
    ok('string', null);
    // A field absent from the submission is not checked.
    expect(() => validateSchema({}, field('int'))).not.toThrow();
  });

  it('only checks the field for its own key (order/priority columns are separate)', () => {
    const schema: ResponseField[] = [
      { componentCode: 'Q1', columnName: 'VALUE', dataType: 'string' },
      { componentCode: 'Q1', columnName: 'ORDER', dataType: 'int' },
    ];
    // Q1.value is a string (ok); Q1.order is an int (ok) — keyed independently.
    expect(() =>
      validateSchema({ 'Q1.value': 'hi', 'Q1.order': 2 }, schema),
    ).not.toThrow();
    // A bad Q1.order is caught even when Q1.value is fine.
    expect(() =>
      validateSchema({ 'Q1.value': 'hi', 'Q1.order': 'nope' }, schema),
    ).toThrow(/Wrong value type/);
  });

  it('rejects a value whose data type is not one we model', () => {
    // Unreachable in practice (the engine only emits known types), but the
    // conservative default is to reject rather than pass an unchecked value.
    bad('something-new', { whatever: true });
  });
});
