import { Calculation } from '../../engine/engine.types';

/** Stored in `responses.computations` for a calculation that failed. */
export const ERROR_VALUE = '#ERROR';

/** How one calculation shows on one response. */
export type CalculatedState = 'value' | 'error' | 'empty' | 'not_computed';

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
    if (computations[code] === ERROR_VALUE) return { code, label, state: 'error', value: null };
    return { code, label, state: 'value', value: computations[code] };
  });
}

/** An export cell: the value (objects and arrays as JSON), `#ERROR`, empty, or `#NOT_COMPUTED`. */
export function exportCell(calculated: CalculatedValue): unknown {
  switch (calculated.state) {
    case 'value':
      return calculated.value !== null && typeof calculated.value === 'object'
        ? JSON.stringify(calculated.value)
        : calculated.value;
    case 'error':
      return ERROR_VALUE;
    case 'empty':
      return '';
    case 'not_computed':
      return '#NOT_COMPUTED';
  }
}

/**
 * A response's stored `computations` from one engine result: the results,
 * plus `#ERROR` for every calculation that failed on it.
 */
export function toComputations(output: {
  results: Record<string, unknown>;
  errors: Record<string, unknown>;
}): Record<string, unknown> {
  const computations: Record<string, unknown> = { ...output.results };
  for (const code of Object.keys(output.errors)) computations[code] = ERROR_VALUE;
  return computations;
}
