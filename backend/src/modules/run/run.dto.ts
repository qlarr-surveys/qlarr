import {
  NavigationDirectionJson,
  NavigationIndexJson,
} from '../../engine/engine.types';
import { SurveyNavigationData } from '../surveys/survey-navigation-data';

/** A survey language (≈ engine `SurveyLang`). */
export interface SurveyLang {
  code: string;
  name: string;
}

/** ≈ StartRequest — begin a response. `navigationMode` is the uppercase name. */
export interface StartRequest {
  lang?: string;
  navigationMode?: string;
  values?: Record<string, unknown>;
  clientUTCTime?: string;
}

/** Preview one question on its own, without creating a response. */
export interface StartAtRequest {
  lang?: string;
  questionId: string;
  clientUTCTime?: string;
}

/** ≈ NavigateRequest — advance an existing response. */
export interface NavigateRequest {
  responseId: string;
  lang?: string;
  navigationMode?: string;
  navigationDirection: NavigationDirectionJson;
  values?: Record<string, unknown>;
  events?: unknown[];
  clientUTCTime?: string;
}

/** ≈ RunSurveyDto — the current screen the respondent sees. */
export interface RunSurveyDto {
  survey: Record<string, unknown>;
  state: Record<string, unknown>;
  navigationData: SurveyNavigationData;
  navigationIndex: NavigationIndexJson;
  /** `null` for a single-question preview, which saves nothing. */
  responseId: string | null;
  lang: SurveyLang;
  additionalLang: SurveyLang[];
  saveTimings: boolean;
  screenedOutQuota: string | null;
}
