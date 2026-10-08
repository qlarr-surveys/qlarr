/**
 * TypeScript shapes for the survey-engine JSON I/O. The engine wrappers speak
 * JSON strings; these model the parsed structures the backend consumes (the
 * `ValidationJsonOutput` / `NavigationJsonOutput` the backend deserializes
 * into). Only the fields the backend actually reads are typed strictly; the rest
 * are passed through.
 */

/** A response schema field (≈ engine `ResponseField`). */
export interface ResponseField {
  componentCode: string;
  columnName: 'VALUE' | 'ORDER' | 'PRIORITY' | string;
  dataType: unknown;
}

/** One entry in the flattened component index (≈ engine `ComponentIndex`). */
export interface ComponentIndex {
  code: string;
  [key: string]: unknown;
}

/** Output of validate/process/changeCode (≈ backend `ValidationJsonOutput`). */
export interface ValidationJsonOutput {
  survey: Record<string, unknown>;
  schema: ResponseField[];
  replacements: Record<string, string>;
  impactMap: Record<string, unknown>;
  componentIndexList: ComponentIndex[];
  skipMap: Record<string, unknown[]>;
  script: string;
}

/** The designer-facing shape (≈ backend `DesignerInput`): the flattened survey
 *  state + its component index. */
export interface DesignerInput {
  state: Record<string, unknown>;
  componentIndexList: ComponentIndex[];
}

export type NavigationModeName =
  | 'ALL_IN_ONE'
  | 'GROUP_BY_GROUP'
  | 'QUESTION_BY_QUESTION';

export type SurveyModeName = 'ONLINE' | 'OFFLINE';

/**
 * The serialized navigation position (≈ engine `NavigationIndex`). `name` is the
 * discriminator: `groups` | `group` | `question` | `end`. This is what's stored
 * in `responses.nav_index` and echoed in navigation output.
 */
export interface NavigationIndexJson {
  name: string;
  groupId?: string;
  groupIds?: string[];
  questionId?: string;
  showError?: boolean;
}

/**
 * The engine's `NavigationDirection` serial constants — uppercase, the exact
 * strings the frontend sends and the engine's `NavigationDirectionSerializer`
 * decodes. Single source of truth: every site that switches on a direction
 * (the engine adapter's `toNavigationDirection`, the run-flow guards) reads
 * from here so the string literals can't drift apart.
 */
export const NAV_DIRECTION = {
  START: 'START',
  NEXT: 'NEXT',
  PREV: 'PREV',
  RESUME: 'RESUME',
  SAVE: 'SAVE',
  JUMP: 'JUMP',
} as const;
export type NavDirectionName = (typeof NAV_DIRECTION)[keyof typeof NAV_DIRECTION];

/**
 * Where to move (≈ engine `NavigationDirection`). `JUMP` carries a target index.
 */
export type NavigationDirectionJson =
  | { name: Exclude<NavDirectionName, typeof NAV_DIRECTION.JUMP> }
  | { name: typeof NAV_DIRECTION.JUMP; navigationIndex: NavigationIndexJson };

/** Result of a navigation step (≈ backend `NavigationJsonOutput`). */
export interface NavigationJsonOutput {
  survey: Record<string, unknown>;
  state: Record<string, unknown>;
  navigationIndex: NavigationIndexJson;
  toSave: Record<string, unknown>;
}

/** Inputs to `EngineService.navigate` (all JSON-friendly). */
export interface NavigateParams {
  values: string; // JSON of the values map
  processedSurvey: string; // stringified ValidationJsonOutput
  lang: string | null;
  navigationMode: NavigationModeName;
  navigationIndex: NavigationIndexJson | null;
  navigationDirection: NavigationDirectionJson;
  skipInvalid: boolean;
  surveyMode: SurveyModeName;
}
