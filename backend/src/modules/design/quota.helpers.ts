// Survey variables never come from the client: calculated ones come from the engine, input ones from us.
export const SURVEY_VARIABLE_PREFIX = 'Survey.var_';
/** Saved with the response: whether it belongs to the quota. */
export const quotaMetKey = (code: string) => `${SURVEY_VARIABLE_PREFIX}${code}_met`;
/** Passed in on every navigation, never saved: whether the quota is full. */
export const quotaFullKey = (code: string) => `${SURVEY_VARIABLE_PREFIX}${code}_full`;
const QUOTA_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_]*$/;

export interface QuotaDefinition {
  code: string;
  label: string;
  limit: number;
}

export function quotaDefinitions(survey: Record<string, unknown>): QuotaDefinition[] {
  const raw = survey['quotas'];
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.flatMap((quota) => {
    if (!quota || typeof quota !== 'object') return [];
    const { code, label, limit } = quota as Record<string, unknown>;
    if (typeof code !== 'string' || !QUOTA_CODE_RE.test(code) || seen.has(code)) return [];
    seen.add(code);
    return [
      {
        code,
        label: typeof label === 'string' ? label : code,
        limit: typeof limit === 'number' && Number.isInteger(limit) && limit > 0 ? limit : 0,
      },
    ];
  });
}

export function fullQuotaCodes(
  definitions: QuotaDefinition[],
  counts: Record<string, number>,
): string[] {
  return definitions
    .filter((quota) => quota.limit > 0 && (counts[quota.code] ?? 0) >= quota.limit)
    .map((quota) => quota.code);
}

export function screenedOutQuota(
  fullQuotas: string[],
  navigationIndex: { name: string },
  toSave: Record<string, unknown>,
): string | null {
  if (navigationIndex.name !== 'end' || toSave['Survey.disqualified'] !== true) {
    return null;
  }
  return fullQuotas.find((code) => toSave[quotaMetKey(code)] === true) ?? null;
}

export function stripQuotaKeys(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !key.startsWith(SURVEY_VARIABLE_PREFIX)),
  );
}

/** Engine input values marking the given quotas as full. */
export function fullQuotaValues(fullQuotas: string[]): Record<string, true> {
  return Object.fromEntries(fullQuotas.map((code) => [quotaFullKey(code), true]));
}

export function withComputedQuotaKeys(
  values: Record<string, unknown>,
  computed: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...stripQuotaKeys(values),
    ...Object.fromEntries(
      Object.entries(computed).filter(([key]) => key.startsWith(SURVEY_VARIABLE_PREFIX)),
    ),
  };
}
