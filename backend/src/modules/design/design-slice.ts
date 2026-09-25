import { DesignDto } from './design.dto';

/** One text to write: the designer's `changeContent` payload. */
export interface ContentChange {
  code: string;
  lang: string;
  key: string;
  value: string;
}

export interface DesignAction {
  type: string;
  payload?: unknown;
}

/**
 * The designer's action creators (`designState.actions`), by reducer name:
 * `changeContent`, `changeAttribute`, … Payloads are typed where known.
 */
export interface DesignActions {
  changeContent(change: ContentChange): DesignAction;
  [name: string]: (payload?: unknown) => DesignAction;
}

type ReduxDesignState = Record<string, unknown>;

/** The parts of the designer's slice (`frontend/src/state/design/designState.js`) used here. */
interface DesignSlice {
  designState: {
    reducer: (state: ReduxDesignState, action: DesignAction) => ReduxDesignState;
    getInitialState: () => ReduxDesignState;
    actions: DesignActions;
  };
}

// The slice is ESM, and under "module": "commonjs" TS compiles import() to
// require(). A Function-built import() stays a real one; its `~/` specifier
// resolves through frontend-src/loader.mjs.
const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<DesignSlice>;

let slice: Promise<DesignSlice> | undefined;

/**
 * The designer's Redux slice, loaded once. Needs the process started with
 * `--import ./frontend-src/register.mjs` (the start scripts and Dockerfile do).
 */
function designSlice(): Promise<DesignSlice> {
  slice ??= importEsm('~/state/design/designState.js');
  return slice;
}

/**
 * Runs designer actions over a saved design with the designer's own reducer,
 * so each edit comes out exactly as if made in the designer (a text's `{{…}}`
 * format instructions and embedded resources included). Returns the changed
 * components: the component-level diff the designer's auto-save sends to
 * `setDesign`.
 *
 * @example
 * applyDesignActions(design, ({ changeContent }) => changes.map((change) => changeContent(change)))
 */
export async function applyDesignActions(
  design: DesignDto,
  buildActions: (actions: DesignActions) => DesignAction[],
): Promise<Record<string, unknown>> {
  const { designState } = await designSlice();
  const { designStateReceived } = designState.actions;
  // A copy: the reducer fills in defaults on its payload and Immer freezes what it keeps.
  const before = designState.reducer(
    designState.getInitialState(),
    designStateReceived(structuredClone(design)),
  );
  const after = buildActions(designState.actions).reduce(
    (state, action) => designState.reducer(state, action),
    before,
  );
  // Immer keeps untouched components by reference.
  return Object.fromEntries(
    Object.keys(design.designerInput.state)
      .filter((code) => after[code] !== before[code])
      .map((code) => [code, after[code]]),
  );
}
