import { ValueTransformer } from 'typeorm';
import { NavigationMode, navigationModeFrom } from './survey.enums';

/** 10 years — the default resume window. */
export const TEN_YEARS_MILLIS = 31_536_000_000;

/**
 * The `navigation_data` TEXT column holds a JSON object mirroring the engine's
 * `SurveyNavigationData` data class. Field names and defaults match it exactly.
 */
export interface SurveyNavigationData {
  navigationMode: NavigationMode;
  allowPrevious: boolean;
  resumeExpiryMillis: number;
  skipInvalid: boolean;
  allowIncomplete: boolean;
  allowJump: boolean;
}

export function defaultNavigationData(): SurveyNavigationData {
  return {
    navigationMode: 'GROUP_BY_GROUP',
    allowPrevious: true,
    resumeExpiryMillis: TEN_YEARS_MILLIS,
    skipInvalid: true,
    allowIncomplete: true,
    allowJump: true,
  };
}

/** Parse a `navigation_data` TEXT value (JSON string) into a full typed object.
 * Used where TypeORM's column transformer doesn't run (raw SQL projections). */
export function parseNavigationData(
  value: string | null | undefined,
): SurveyNavigationData {
  if (!value) return defaultNavigationData();
  try {
    return normalize(JSON.parse(value));
  } catch {
    return defaultNavigationData();
  }
}

/** Coerces a parsed blob (possibly partial/legacy) into a full, typed object. */
function normalize(raw: Partial<SurveyNavigationData> | null): SurveyNavigationData {
  const d = defaultNavigationData();
  if (!raw) return d;
  return {
    navigationMode: navigationModeFrom(raw.navigationMode),
    allowPrevious: raw.allowPrevious ?? d.allowPrevious,
    resumeExpiryMillis: raw.resumeExpiryMillis ?? d.resumeExpiryMillis,
    skipInvalid: raw.skipInvalid ?? d.skipInvalid,
    allowIncomplete: raw.allowIncomplete ?? d.allowIncomplete,
    allowJump: raw.allowJump ?? d.allowJump,
  };
}

/**
 * TypeORM transformer for the `navigation_data` TEXT-as-JSON column (§5 of the
 * migration plan). A null/blank column reads back as the default object.
 */
export const navigationDataTransformer: ValueTransformer = {
  to: (value: SurveyNavigationData | null): string =>
    JSON.stringify(value ?? defaultNavigationData()),
  from: (value: string | null): SurveyNavigationData => parseNavigationData(value),
};
