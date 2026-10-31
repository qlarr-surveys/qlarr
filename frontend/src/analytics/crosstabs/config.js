/**
 * Crosstab analysis config: what the analyst picks in the UI and what gets sent
 * to the backend tabulation endpoint. Weight targets are kept keyed by weight
 * variable so switching the weight var preserves each var's targets.
 */

export const DEFAULT_OPTIONS = { counts: true, pct: true, significance: true };

/** Pick sensible starting variables from a freshly loaded catalogue. */
export function initialConfig(catalogue) {
  const rowVar = catalogue?.rowVariables?.[0]?.id ?? null;
  // Prefer a column that isn't the same underlying question as the row.
  const cols = catalogue?.colVariables ?? [];
  const colVar = (cols.find((c) => c.code !== rowVar) ?? cols[0])?.code ?? null;
  return {
    rowVar,
    colVar,
    weightVar: null,
    targets: {}, // { [weightVar]: { [categoryCode]: percent } }
    filters: [], // [{ var: rowVariable.id, codes: [categoryCode] }], ANDed
    options: { ...DEFAULT_OPTIONS },
  };
}

/**
 * Drop filters a saved plan carries that no longer match the catalogue (the
 * design changed since): unknown variables go, unknown categories are trimmed,
 * and a filter left with no categories goes too.
 */
export function sanitizeConfig(config, catalogue) {
  const vars = new Map((catalogue?.rowVariables ?? []).map((v) => [v.id, v]));
  const filters = (config.filters ?? []).flatMap((f) => {
    const v = vars.get(f.var);
    if (!v) return [];
    const known = new Set(v.categories.map((c) => c.code));
    const codes = f.codes.filter((c) => known.has(c));
    return codes.length ? [{ var: f.var, codes }] : [];
  });
  return { ...config, filters };
}

/** Filters that actually narrow the base (a filter with no categories picked yet doesn't). */
export const activeFilters = (config) =>
  (config.filters ?? []).filter((f) => f.codes.length > 0);

/** Even split (one decimal) used as the default target for a weight variable. */
export function defaultTargets(categories) {
  const share = Math.round((1000 / categories.length)) / 10;
  const out = {};
  for (const c of categories) out[c.code] = share;
  return out;
}

export function configReducer(state, action) {
  switch (action.type) {
    case 'SET_ROW':
      return { ...state, rowVar: action.value };
    case 'SET_COL':
      return { ...state, colVar: action.value };
    case 'SET_WEIGHT':
      return { ...state, weightVar: action.value || null };
    case 'SET_TARGETS':
      // action.weightVar, action.targets (full map for that var)
      return {
        ...state,
        targets: { ...state.targets, [action.weightVar]: action.targets },
      };
    case 'SET_TARGET':
      return {
        ...state,
        targets: {
          ...state.targets,
          [action.weightVar]: {
            ...(state.targets[action.weightVar] ?? {}),
            [action.category]: action.value,
          },
        },
      };
    case 'ADD_FILTER':
      return { ...state, filters: [...state.filters, { var: action.var, codes: [] }] };
    case 'SET_FILTER_CODES':
      return {
        ...state,
        filters: state.filters.map((f, i) =>
          i === action.index ? { ...f, codes: action.codes } : f,
        ),
      };
    case 'REMOVE_FILTER':
      return { ...state, filters: state.filters.filter((_, i) => i !== action.index) };
    case 'SET_OPTION':
      return {
        ...state,
        options: { ...state.options, [action.key]: action.value },
      };
    case 'LOAD':
      // Plans saved before filters existed carry none.
      return { ...action.config, filters: action.config.filters ?? [] };
    default:
      return state;
  }
}

/** Build the backend request body from the current config. */
export function toRequest(config, maxResponses) {
  const body = {
    rowVar: config.rowVar,
    colVar: config.colVar,
    options: config.options,
  };
  const filters = activeFilters(config);
  if (filters.length) body.filters = filters;
  if (config.weightVar) {
    body.weightVar = config.weightVar;
    body.targets = config.targets[config.weightVar] ?? {};
  }
  if (maxResponses != null) body.maxResponses = maxResponses;
  return body;
}

/** Active filters with display labels: [{ label, values: [categoryLabel] }]. */
export function describeFilters(config, catalogue) {
  const vars = new Map((catalogue?.rowVariables ?? []).map((v) => [v.id, v]));
  return activeFilters(config).map((f) => {
    const v = vars.get(f.var);
    const labels = new Map((v?.categories ?? []).map((c) => [c.code, c.label]));
    return { label: v?.label ?? f.var, values: f.codes.map((c) => labels.get(c) ?? c) };
  });
}
