import { DesignDto } from './design.dto';

/** One text to write: the designer's `changeContent` payload. */
export interface ContentChange {
  code: string;
  lang: string;
  key: string;
  value: string;
}

interface Action {
  type: string;
  payload?: unknown;
}

type ReduxDesignState = Record<string, unknown>;

/** The parts of the designer's slice (`frontend/src/state/design/designState.js`) used here. */
interface DesignSlice {
  designState: {
    reducer: (state: ReduxDesignState, action: Action) => ReduxDesignState;
    getInitialState: () => ReduxDesignState;
  };
  designStateReceived: (design: DesignDto) => Action;
  changeContent: (change: ContentChange) => Action;
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
export function designSlice(): Promise<DesignSlice> {
  slice ??= importEsm('~/state/design/designState.js');
  return slice;
}

/**
 * Runs the designer's own `changeContent` for each change over a saved design,
 * so the text, its `{{…}}` format instructions and its embedded resources come
 * out exactly as if typed in the designer. Returns the changed components: the
 * component-level diff the designer's auto-save sends to `setDesign`.
 */
export async function applyContentChanges(
  design: DesignDto,
  changes: ContentChange[],
): Promise<Record<string, unknown>> {
  const { designState, designStateReceived, changeContent } = await designSlice();
  // A copy: the reducer fills in defaults on its payload and Immer freezes what it keeps.
  const before = designState.reducer(
    designState.getInitialState(),
    designStateReceived(structuredClone(design)),
  );
  const after = changes.reduce(
    (state, change) => designState.reducer(state, changeContent(change)),
    before,
  );
  // Immer keeps untouched components by reference.
  return Object.fromEntries(
    Object.keys(design.designerInput.state)
      .filter((code) => after[code] !== before[code])
      .map((code) => [code, after[code]]),
  );
}
