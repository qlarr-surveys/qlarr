import { com, kotlin } from '@qlarr/survey-engine';
import {
  NavigateParams,
  NavigationDirectionJson,
  NavigationIndexJson,
  NavigationJsonOutput,
  NavigationModeName,
  SurveyModeName,
  ValidationJsonOutput,
} from './engine.types';

/**
 * The heavy, author-JS-executing engine operations, extracted from
 * `EngineService` so the *exact same code* can run either in-process or inside a
 * Piscina worker (`engine.worker.ts`). Everything here is a pure function of its
 * arguments — no Nest, no `this`, no shared state — so it is safe to run on a
 * worker thread and cheap to structured-clone across the boundary.
 *
 * These four ops (`validate` / `process` / `navigate` / `changeCode`) compile and
 * evaluate survey-author JavaScript through the KMP engine, so a malicious or
 * buggy design can loop forever or blow the heap. Running them off the main
 * thread is what lets the pool enforce a hard timeout (terminate the worker) and
 * a memory cap without taking the whole server down.
 */

// The published engine is a KMP/JS build exposing everything under nested
// `com.qlarr.surveyengine.*` namespaces; alias the bits we use once here so the
// interop stays in one place. All I/O is JSON strings.
const usecase = com.qlarr.surveyengine.usecase;
const ext = com.qlarr.surveyengine.ext;
const model = com.qlarr.surveyengine.model;
const exposed = com.qlarr.surveyengine.model.exposed;
const scriptengine = com.qlarr.surveyengine.scriptengine;
const KtList = kotlin.collections.KtList;

/**
 * The engine's validator logs the parsed AST to stdout. Silence stdout for the
 * duration of an engine call so it doesn't flood the logs. When this runs on a
 * worker thread the patch is confined to that worker (one task at a time), so it
 * can't drop another request's output.
 */
function quietly<T>(fn: () => T): T {
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = (() => true) as typeof process.stdout.write;
  try {
    return fn();
  } finally {
    process.stdout.write = original;
  }
}

// "componentCode.reservedCode" — the impact-map key/value form.
const componentCodeOf = (s: string): string => s.slice(0, s.lastIndexOf('.'));
const reservedCodeOf = (s: string): string => s.slice(s.lastIndexOf('.') + 1);
const lastOf = (a: string[]): string => a[a.length - 1];

/** Walk from `node` down `path` (child codes) and run `apply` on the target. */
function applyToPath(
  node: Record<string, unknown>,
  path: string[],
  apply: (n: Record<string, unknown>) => void,
): void {
  if (path.length === 0) {
    apply(node);
    return;
  }
  const [head, ...rest] = path;
  for (const key of ['groups', 'questions', 'answers', 'children']) {
    const arr = node[key];
    if (Array.isArray(arr)) {
      const child = arr.find((c) => (c as { code?: string })?.code === head);
      if (child) {
        applyToPath(child as Record<string, unknown>, rest, apply);
        return;
      }
    }
  }
}

/**
 * Whether a from→to rename crosses component kinds / shapes (≈ the engine's
 * `wrongType`). Replicated literally, including the `.take(n)` char-prefix
 * comparison of the source strings.
 */
function wrongType(from: string, to: string): boolean {
  const fromSplit = ext.splitToComponentCodes(from);
  const toSplit = ext.splitToComponentCodes(to);
  return (
    (ext.isGroupCode(from) && !ext.isGroupCode(to)) ||
    (ext.isGroupCode(to) && !ext.isGroupCode(from)) ||
    (ext.isQuestionCode(from) && !ext.isQuestionCode(to)) ||
    (ext.isQuestionCode(to) && !ext.isQuestionCode(from)) ||
    fromSplit.length !== toSplit.length ||
    (fromSplit.length > 1 &&
      from.slice(0, fromSplit.length - 1) !== to.slice(0, toSplit.length - 1)) ||
    (fromSplit.length > 1 &&
      (!ext.isAnswerCode(lastOf(fromSplit)) || !ext.isAnswerCode(lastOf(toSplit))))
  );
}

// --- navigation object construction (JS values → engine KMP objects) ---

function toNavigationMode(name: NavigationModeName) {
  switch (name) {
    case 'ALL_IN_ONE':
      return exposed.NavigationMode.ALL_IN_ONE;
    case 'QUESTION_BY_QUESTION':
      return exposed.NavigationMode.QUESTION_BY_QUESTION;
    default:
      return exposed.NavigationMode.GROUP_BY_GROUP;
  }
}

function toSurveyMode(name: SurveyModeName) {
  return name === 'OFFLINE'
    ? exposed.SurveyMode.OFFLINE
    : exposed.SurveyMode.ONLINE;
}

function toNavigationIndex(index: NavigationIndexJson | null | undefined) {
  if (!index) return undefined;
  const NI = exposed.NavigationIndex;
  const showError = index.showError ?? false;
  switch (index.name) {
    case 'groups':
      return new NI.Groups(KtList.fromJsArray(index.groupIds ?? []), showError);
    case 'group':
      return new NI.Group(index.groupId ?? '', showError);
    case 'question':
      return new NI.Question(index.questionId ?? '', showError);
    case 'end':
      return new NI.End(index.groupId ?? '');
    default:
      return undefined;
  }
}

function toNavigationDirection(direction: NavigationDirectionJson) {
  const ND = exposed.NavigationDirection;
  // The wire names are the engine's own serial constants — uppercase
  // (START / PREV / NEXT / RESUME / SAVE / JUMP), which is exactly what the
  // frontend and the engine's `NavigationDirectionSerializer` use. Normalise so
  // a server-generated `Start` (capitalised) resolves too.
  switch (direction.name.toUpperCase()) {
    case 'NEXT':
      return ND.Next;
    case 'PREV':
      return ND.Previous;
    case 'RESUME':
      return ND.Resume;
    case 'SAVE':
      return ND.Save;
    case 'JUMP':
      return new ND.Jump(
        toNavigationIndex(
          'navigationIndex' in direction ? direction.navigationIndex : undefined,
        )!,
      );
    default:
      return ND.Start;
  }
}

/** Replace every `from`→`to` inside a node's JSON object field (relevance / skip_logic). */
function replaceInField(
  node: Record<string, unknown>,
  field: string,
  from: string,
  to: string,
): void {
  const obj = node[field];
  if (obj && typeof obj === 'object') {
    node[field] = JSON.parse(JSON.stringify(obj).split(from).join(to));
  }
}

/** Validate a complete survey design → schema, script, impact map, etc. */
export function runValidate(surveyJson: string): ValidationJsonOutput {
  return JSON.parse(
    quietly(() => usecase.ValidationUseCaseWrapper.create(surveyJson).validate()),
  );
}

/**
 * Run one navigation step (≈ `SurveyProcessor.navigate`): build the engine
 * mode/index/direction objects and drive the navigation state machine, returning
 * the next screen + the values to persist.
 */
export function runNavigate(params: NavigateParams): NavigationJsonOutput {
  const wrapper = usecase.NavigationUseCaseWrapper.init(
    params.values,
    params.processedSurvey,
    params.lang,
    toNavigationMode(params.navigationMode),
    toNavigationIndex(params.navigationIndex),
    toNavigationDirection(params.navigationDirection),
    params.skipInvalid,
    toSurveyMode(params.surveyMode),
  );
  return JSON.parse(
    quietly(() => wrapper.navigate(scriptengine.createNavigationEngine())),
  );
}

/**
 * Apply a designer edit (`state`) onto the saved design and re-validate
 * (≈ `SurveyProcessor.process`): flatten the saved design, overlay the changed
 * fields, rebuild the nested `Survey` node, then validate.
 */
export function runProcess(
  state: Record<string, unknown>,
  savedDesign: Record<string, unknown>,
): ValidationJsonOutput {
  const flat = JSON.parse(ext.flatObject(JSON.stringify(savedDesign))) as Record<
    string,
    unknown
  >;
  for (const key of Object.keys(state)) {
    flat[key] = state[key];
  }
  const surveyNode = ext.addChildren(
    JSON.stringify(flat['Survey']),
    'Survey',
    JSON.stringify(flat),
  );
  return JSON.parse(
    quietly(() => usecase.ValidationUseCaseWrapper.create(surveyNode).validate()),
  );
}

/**
 * Why a `change_code` request was rejected. Returned (not thrown) so it survives
 * structured-cloning back from the worker; `EngineService` maps each to the
 * matching HTTP exception on the main thread.
 */
export type ChangeCodeReason =
  | 'identical'
  | 'from_unavailable'
  | 'duplicate_to'
  | 'invalid_change';

export type ChangeCodeResult =
  | { ok: true; output: ValidationJsonOutput }
  | { ok: false; reason: ChangeCodeReason };

/**
 * Rename a component code across the whole design (≈ `SurveyProcessor.changeCode`):
 * validate the request, let the engine rename the structure, then rewrite the
 * `from`→`to` references inside affected relevance and skip-logic expressions
 * (which the engine leaves as opaque script strings). Precondition failures are
 * returned as `{ ok: false }` rather than thrown, so the result clones cleanly.
 */
export function runChangeCode(
  surveyDesign: string,
  from: string,
  to: string,
): ChangeCodeResult {
  const source = JSON.parse(surveyDesign) as ValidationJsonOutput;
  if (from === to) return { ok: false, reason: 'identical' };
  if (!source.componentIndexList.some((c) => c.code === from)) {
    return { ok: false, reason: 'from_unavailable' };
  }
  if (source.componentIndexList.some((c) => c.code === to)) {
    return { ok: false, reason: 'duplicate_to' };
  }
  if (wrongType(from, to) || to === 'Qthis' || to === 'Gthis') {
    return { ok: false, reason: 'invalid_change' };
  }

  const result = JSON.parse(
    quietly(() =>
      usecase.ChangeCodeUseCaseWrapper.create(surveyDesign).changeCode(from, to),
    ),
  ) as ValidationJsonOutput;

  const cilJson = JSON.stringify(result.componentIndexList);
  const conditionalRelevance = model.ReservedCodes.conditionalRelevance;

  // Rewrite relevance expressions that reference the renamed code.
  for (const [depKey, dependents] of Object.entries(result.impactMap)) {
    if (!componentCodeOf(depKey).includes(to)) continue;
    for (const dependent of dependents as string[]) {
      if (reservedCodeOf(dependent) !== conditionalRelevance) continue;
      const code = componentCodeOf(dependent);
      const path = [
        ...model.parents(cilJson, code),
        lastOf(ext.splitToComponentCodes(code)),
      ];
      applyToPath(result.survey, path, (n) =>
        replaceInField(n, 'relevance', from, to),
      );
    }
  }

  // Rewrite skip logic when renaming a group/question.
  if (ext.isGroupCode(from) || ext.isQuestionCode(from)) {
    for (const item of result.componentIndexList) {
      if (!model.hasSkip(JSON.stringify(item))) continue;
      const path = [
        ...model.parents(cilJson, item.code),
        lastOf(ext.splitToComponentCodes(item.code)),
      ];
      applyToPath(result.survey, path, (n) =>
        replaceInField(n, 'skip_logic', from, to),
      );
    }
  }

  return { ok: true, output: result };
}

/** The engine operations the pool/worker can run. */
export type EngineOp = 'validate' | 'navigate' | 'process' | 'changeCode';

export type EngineTask =
  | { op: 'validate'; payload: string }
  | { op: 'navigate'; payload: NavigateParams }
  | {
      op: 'process';
      payload: { state: Record<string, unknown>; savedDesign: Record<string, unknown> };
    }
  | { op: 'changeCode'; payload: { surveyDesign: string; from: string; to: string } };

/**
 * Single dispatch point shared by the in-process fallback and the worker, so the
 * two paths can never drift.
 */
export function dispatch(task: EngineTask): unknown {
  switch (task.op) {
    case 'validate':
      return runValidate(task.payload);
    case 'navigate':
      return runNavigate(task.payload);
    case 'process':
      return runProcess(task.payload.state, task.payload.savedDesign);
    case 'changeCode':
      return runChangeCode(
        task.payload.surveyDesign,
        task.payload.from,
        task.payload.to,
      );
  }
}
