/**
 * Survey status/usage. The DB stores the enum NAME (uppercase), while the JSON
 * API speaks lowercase. So the mapping is a plain case flip: `draft`⇄`DRAFT`.
 * These `*Api` types are the wire shape; `*ToDb`/`*FromDb` cross the boundary.
 */
export type Status = 'draft' | 'active' | 'closed';
export type Usage = 'web' | 'offline' | 'mixed';

const STATUSES: readonly Status[] = ['draft', 'active', 'closed'];
const USAGES: readonly Usage[] = ['web', 'offline', 'mixed'];

/** API (lowercase) → DB (uppercase enum name). */
export const statusToDb = (s: Status): string => s.toUpperCase();
export const usageToDb = (u: Usage): string => u.toUpperCase();

/** DB (uppercase enum name) → API (lowercase). Defaults mirror the entity's
 * non-null fields for the (shouldn't-happen) null column case. */
export function statusFromDb(v: string | null | undefined): Status {
  const s = (v ?? '').toLowerCase();
  return (STATUSES as readonly string[]).includes(s) ? (s as Status) : 'draft';
}
export function usageFromDb(v: string | null | undefined): Usage {
  const u = (v ?? '').toLowerCase();
  return (USAGES as readonly string[]).includes(u) ? (u as Usage) : 'mixed';
}

/**
 * Navigation mode. Unlike status/usage this serializes the enum NAME verbatim —
 * the wire form and the DB blob form are both uppercase (`GROUP_BY_GROUP`), no
 * case flip.
 */
export type NavigationMode =
  | 'ALL_IN_ONE'
  | 'GROUP_BY_GROUP'
  | 'QUESTION_BY_QUESTION';

/** Mirrors NavigationMode.fromString: unknown/absent → GROUP_BY_GROUP. */
export function navigationModeFrom(v: string | null | undefined): NavigationMode {
  switch ((v ?? '').toUpperCase()) {
    case 'ALL_IN_ONE':
      return 'ALL_IN_ONE';
    case 'QUESTION_BY_QUESTION':
      return 'QUESTION_BY_QUESTION';
    default:
      return 'GROUP_BY_GROUP';
  }
}
