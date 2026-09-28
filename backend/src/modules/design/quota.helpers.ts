/**
 * Segment quotas: pure helpers shared by navigation, publish and the quota
 * status endpoint.
 *
 * A quota lives in the design in two parts, both on the Survey node:
 *  - `quotas: [{ code, label, limit, condition }]` — designer metadata (limit,
 *    label, the logic-builder rule), read only by the backend and the designer.
 *  - an engine instruction `quota_<code>` whose text is the compiled condition.
 *    The engine evaluates it and saves the result per response as
 *    `Survey.quota_<code>` (membership). Membership is recomputed from the
 *    current answers on every navigation; no quota history is persisted.
 */

export const QUOTA_VALUE_PREFIX = 'Survey.quota_';
const QUOTA_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_]*$/;

export interface QuotaDefinition {
  code: string;
  label: string;
  /** Max completes; only a positive limit is enforced. */
  limit: number;
}

/** The quotas declared on a design's Survey node, skipping malformed entries. */
export function quotaDefinitions(survey: Record<string, unknown>): QuotaDefinition[] {
  const raw = survey['quotas'];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((quota) => {
    if (!quota || typeof quota !== 'object') return [];
    const { code, label, limit } = quota as Record<string, unknown>;
    if (typeof code !== 'string' || !QUOTA_CODE_RE.test(code)) return [];
    return [
      {
        code,
        label: typeof label === 'string' ? label : code,
        limit: typeof limit === 'number' && Number.isInteger(limit) && limit > 0 ? limit : 0,
      },
    ];
  });
}

/** Codes of the enforced quotas whose count reached their limit. */
export function fullQuotaCodes(
  definitions: QuotaDefinition[],
  counts: Record<string, number>,
): string[] {
  return definitions
    .filter((quota) => quota.limit > 0 && (counts[quota.code] ?? 0) >= quota.limit)
    .map((quota) => quota.code);
}

/**
 * The quota that screened the respondent out: when the engine ended the survey
 * as disqualified, the first full quota (in design order) the respondent belongs
 * to — the same rule the engine applies. The run page shows that quota's end
 * message; null for normal endings and for skip-to-end disqualifications.
 */
export function screenedOutQuota(
  fullQuotas: string[],
  navigationIndex: { name: string },
  toSave: Record<string, unknown>,
): string | null {
  if (navigationIndex.name !== 'end' || toSave['Survey.disqualified'] !== true) {
    return null;
  }
  return fullQuotas.find((code) => toSave[`${QUOTA_VALUE_PREFIX}${code}`] === true) ?? null;
}

/**
 * Drop engine-owned quota keys from respondent-submitted values: membership is
 * computed by the engine, and a client that could send its own
 * `Survey.quota_<code>` would decide which quotas it belongs to.
 */
export function stripQuotaKeys(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !key.startsWith(QUOTA_VALUE_PREFIX)),
  );
}
