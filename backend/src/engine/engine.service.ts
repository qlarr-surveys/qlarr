import { Injectable } from '@nestjs/common';
import { com } from '@qlarr/survey-engine';
import {
  ComponentIndex,
  DesignerInput,
  NavigateParams,
  NavigationJsonOutput,
  ValidationJsonOutput,
} from './engine.types';
import { ChangeCodeResult } from './engine-runtime';
import { EnginePool } from './engine.pool';
import {
  DuplicateToCodeException,
  FromCodeNotAvailableException,
  IdenticalFromToCodesException,
  InvalidCodeChangeException,
} from './engine.exceptions';

// The published engine is a KMP/JS build exposing everything under nested
// `com.qlarr.surveyengine.*` namespaces; alias the bits used by the light,
// in-process helpers here. The heavy, author-JS-executing ops live in
// `engine-runtime.ts` so they can run on a worker thread.
const usecase = com.qlarr.surveyengine.usecase;
const ext = com.qlarr.surveyengine.ext;
const scriptengine = com.qlarr.surveyengine.scriptengine;

const VALUE_SUFFIX = '.value';
const MASKED_SUFFIX = '.masked_value';

/**
 * Thin binding to the Qlarr survey engine (≈ the engine's
 * `expressionmanager.SurveyProcessor`), backed by the `@qlarr/survey-engine`
 * npm package — the same KMP code the JVM runs, so output is authoritative.
 *
 * The four ops that compile/evaluate survey-author JavaScript — `validate`,
 * `navigate`, `process`, `changeCode` — are dispatched through {@link EnginePool}
 * so they run off the main event loop under a hard timeout and memory cap; they
 * are therefore async. The remaining methods here are pure data-shaping or cheap,
 * bounded `ext.*` calls that never execute author expressions, so they stay
 * synchronous and in-process.
 */
@Injectable()
export class EngineService {
  private readonly pool: EnginePool;

  constructor(pool?: EnginePool) {
    // No pool in a bare `new EngineService()` (unit tests) → run in-process.
    this.pool = pool ?? EnginePool.disabled();
  }

  /** Validate a complete survey design → schema, script, impact map, etc. */
  validate(surveyJson: string): Promise<ValidationJsonOutput> {
    return this.pool.run('validate', surveyJson);
  }

  /**
   * Run one navigation step (≈ `SurveyProcessor.navigate`): drive the navigation
   * state machine, returning the next screen + the values to persist.
   */
  navigate(params: NavigateParams): Promise<NavigationJsonOutput> {
    return this.pool.run('navigate', params);
  }

  /**
   * Apply a designer edit (`state`) onto the saved design and re-validate
   * (≈ `SurveyProcessor.process`).
   */
  process(
    state: Record<string, unknown>,
    savedDesign: Record<string, unknown>,
  ): Promise<ValidationJsonOutput> {
    return this.pool.run('process', { state, savedDesign });
  }

  /**
   * Rename a component code across the whole design (≈ `SurveyProcessor.changeCode`).
   * The engine work runs on the pool; precondition rejections come back as a
   * discriminated result and are mapped to their HTTP exceptions here.
   */
  async changeCode(
    surveyDesign: string,
    from: string,
    to: string,
  ): Promise<ValidationJsonOutput> {
    const result = await this.pool.run<ChangeCodeResult>('changeCode', {
      surveyDesign,
      from,
      to,
    });
    if (result.ok) return result.output;
    switch (result.reason) {
      case 'identical':
        throw new IdenticalFromToCodesException();
      case 'from_unavailable':
        throw new FromCodeNotAvailableException();
      case 'duplicate_to':
        throw new DuplicateToCodeException();
      case 'invalid_change':
        throw new InvalidCodeChangeException();
    }
  }

  /** A blank starter design for a new survey (≈ `ValidationUseCaseWrapper.new`). */
  newSurvey(surveyName: string): string {
    // At runtime `.new` is a plain method, but the KMP .d.ts types it as a
    // construct signature — cast to reach it.
    const factory = usecase.ValidationUseCaseWrapper as unknown as {
      new: (surveyName: string) => string;
    };
    return factory.new(surveyName);
  }

  /**
   * The designer-facing view of a validated survey (≈ `toDesignerInput`): the
   * survey flattened into a code-keyed state map, plus the component index.
   */
  toDesignerInput(output: ValidationJsonOutput): DesignerInput {
    return {
      state: JSON.parse(ext.flatObject(JSON.stringify(output.survey))),
      componentIndexList: output.componentIndexList,
    };
  }

  /** The resource file names a design references (≈ `ValidationJsonOutput.resources`). */
  resources(output: ValidationJsonOutput): string[] {
    return ext.resources(JSON.stringify(output.survey));
  }

  /** Component code → label (HTML) for a language (≈ `ValidationJsonOutput.labels`). */
  labels(
    survey: Record<string, unknown>,
    lang: string,
  ): Record<string, string> {
    return JSON.parse(ext.labels(JSON.stringify(survey), '', lang));
  }

  isQuestionCode(code: string): boolean {
    return ext.isQuestionCode(code);
  }

  /** Split a component code into its ancestor question/answer codes (≈ `splitToComponentCodes`). */
  splitToComponentCodes(code: string): string[] {
    return ext.splitToComponentCodes(code);
  }

  isAnswerCode(code: string): boolean {
    return ext.isAnswerCode(code);
  }

  /** The runtime script shipped to the browser as `runtime.js`. */
  commonScript(): string {
    return scriptengine.getCommonScript();
  }

  /** The design-time expression validator script. */
  engineScript(): string {
    return scriptengine.getEngineScript();
  }

  /**
   * Pull the `*.masked_value` entries that correspond to stored `*.value`
   * answers (≈ `SurveyProcessor.maskedValues`). Pure data shaping — no engine.
   */
  maskedValues(values: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(values)) {
      if (!key.endsWith(VALUE_SUFFIX)) continue;
      const maskedKey = key.slice(0, -VALUE_SUFFIX.length) + MASKED_SUFFIX;
      if (Object.prototype.hasOwnProperty.call(values, maskedKey)) {
        out[maskedKey] = values[maskedKey];
      }
    }
    return out;
  }

  /**
   * Reorder a DFS-flattened component index by a respondent's stored child order
   * (≈ `List<ComponentIndex>.sortChildren`). The first entry is the subtree root;
   * its direct children — each a contiguous sub-block in the list — are reordered
   * by their stored `<childCode>.order` value in the response `values` (falling
   * back to natural position), recursively. Pure data shaping — no engine call.
   * The engine's own `sortChildren` needs real KMP `ComponentIndex` instances,
   * which the JSON-based wrappers here never materialise, so we port it directly.
   */
  sortChildren(
    componentIndexList: ComponentIndex[],
    values: Record<string, unknown>,
  ): ComponentIndex[] {
    return sortComponentIndex(componentIndexList, values);
  }
}

function sortComponentIndex(
  list: ComponentIndex[],
  values: Record<string, unknown>,
): ComponentIndex[] {
  const component = list[0];
  const children = (component?.children as string[] | undefined) ?? [];
  if (children.length === 0) return list;

  // Order key for a child: its stored `<code>.order` int, else 1-based position.
  const orderKey = (child: string): number => {
    const v = values[`${child}.order`];
    return typeof v === 'number' && Number.isInteger(v)
      ? v
      : children.indexOf(child) + 1;
  };
  // Stable ascending sort (Array.prototype.sort is stable) — matches `sortedBy`.
  const sortedChildren = [...children].sort((a, b) => orderKey(a) - orderKey(b));

  const result: ComponentIndex[] = [component];
  for (const child of sortedChildren) {
    const fromIndex = list.findIndex((c) => c.code === child);
    if (fromIndex < 0) continue;
    // The child's sub-block runs until the next sibling (in ORIGINAL order); the
    // original-last child extends to the end of the list.
    const isLast = children.indexOf(child) === children.length - 1;
    let toIndex = isLast
      ? list.length
      : list.findIndex(
          (item) =>
            children.includes(item.code) &&
            children.indexOf(item.code) > children.indexOf(child),
        );
    if (toIndex < 0) toIndex = list.length;
    result.push(...sortComponentIndex(list.slice(fromIndex, toIndex), values));
  }
  return result;
}
