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
    options: { ...DEFAULT_OPTIONS },
  };
}

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
    case 'SET_OPTION':
      return {
        ...state,
        options: { ...state.options, [action.key]: action.value },
      };
    case 'LOAD':
      return { ...action.config };
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
  if (config.weightVar) {
    body.weightVar = config.weightVar;
    body.targets = config.targets[config.weightVar] ?? {};
  }
  if (maxResponses != null) body.maxResponses = maxResponses;
  return body;
}
