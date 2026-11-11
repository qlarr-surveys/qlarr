import { Calculation } from '../../engine/engine.types';

/** How one calculation shows on one response. */
export type CalculatedState = 'value' | 'empty' | 'not_computed';

/** One calculation on one response, as response review shows it. */
export interface CalculatedValue {
  code: string;
  label: string;
  state: CalculatedState;
  /** The result when `state` is `value`; otherwise null. */
  value: unknown;
}

/** The calculations that show on responses and exports: those without errors. */
export function validCalculations(calculations: Calculation[]): Calculation[] {
  return calculations.filter((c) => (c.errors ?? []).length === 0);
}

/**
 * Every valid calculation of the set for one completed response, in the set's
 * order (calculations with errors never run and are left out). A response
 * without `computations` shows every calculation `not_computed`; any that exist
 * are valid for the current set.
 */
export function resolveCalculations(
  calculations: Calculation[],
  computations: Record<string, unknown> | null,
): CalculatedValue[] {
  return validCalculations(calculations).map(({ code, label }) => {
    if (!computations) return { code, label, state: 'not_computed', value: null };
    if (!(code in computations)) return { code, label, state: 'empty', value: null };
    return { code, label, state: 'value', value: computations[code] };
  });
}

/** An export cell: the value (objects and arrays as JSON), empty, or `#NOT_COMPUTED`. */
export function exportCell(calculated: CalculatedValue): unknown {
  switch (calculated.state) {
    case 'value':
      return calculated.value !== null && typeof calculated.value === 'object'
        ? JSON.stringify(calculated.value)
        : calculated.value;
    case 'empty':
      return '';
    case 'not_computed':
      return '#NOT_COMPUTED';
  }
}
