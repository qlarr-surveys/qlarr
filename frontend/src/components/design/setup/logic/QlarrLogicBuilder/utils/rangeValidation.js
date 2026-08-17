/**
 * Check if a range's min value exceeds its max value.
 * Returns false when either value is null/empty (incomplete range).
 * Works for numbers (numeric comparison) and ISO date/time strings (lexicographic).
 */
export function isRangeInverted(min, max, fieldType) {
  if (min == null || max == null || min === '' || max === '') {
    return false;
  }

  return min > max;
}
