import { Injectable } from '@nestjs/common';
import { nowUtcString, wallClockToInstant } from '../../common/datetime';
import { EngineService } from '../../engine/engine.service';
import {
  NAV_DIRECTION,
  NavigationDirectionJson,
  NavigationIndexJson,
  NavigationModeName,
} from '../../engine/engine.types';
import { ProcessedSurvey } from '../design/design.service';
import { ResponseRepository } from '../responses/response.repository';
import { navigationModeFrom } from '../surveys/survey.enums';
import { SurveyIsClosedException } from '../surveys/survey.exceptions';
import { SurveyIsNotActiveException } from '../surveys/survey.exceptions';
import { SurveyLang } from './run.dto';
import {
  JumpNotAllowedException,
  PreviousNotAllowedException,
  ResumeNotAllowedException,
  SurveyDesignWithErrorException,
  SurveyExpiredException,
  SurveyNotStartedException,
  SurveyQuotaExceededException,
} from './run.exceptions';
import {
  additionalLang,
  availableLangByCode,
  defaultSurveyLang,
  validateSchema,
} from './run.helpers';
import { SurveyResponseEntity } from './survey-response.entity';

export interface NavigationResult {
  navigationJsonOutput: {
    survey: Record<string, unknown>;
    state: Record<string, unknown>;
    navigationIndex: NavigationIndexJson;
    toSave: Record<string, unknown>;
  };
  lang: SurveyLang;
  additionalLang: SurveyLang[];
}

/**
 * The navigation gauntlet: enforce that the
 * survey may be navigated (active/valid/quota/window + allowed directions),
 * resolve the language, then drive the engine's navigation state machine.
 */
@Injectable()
export class NavigationService {
  constructor(
    private readonly responses: ResponseRepository,
    private readonly engine: EngineService,
  ) {}

  async navigate(params: {
    surveyId: string;
    response: SurveyResponseEntity | null;
    processedSurvey: ProcessedSurvey;
    navigationDirection: NavigationDirectionJson;
    navigationMode?: string;
    navigationLang?: string;
    values: Record<string, unknown>;
    preview: boolean;
    surveyMode: 'ONLINE' | 'OFFLINE';
  }): Promise<NavigationResult> {
    const { processedSurvey, response, preview } = params;
    const survey = processedSurvey.survey;
    const navData = survey.navigationData;
    // Wire names are the engine's uppercase serial constants (NEXT/PREV/JUMP/…).
    const direction = params.navigationDirection.name.toUpperCase();

    if (!preview && !isActive(survey)) {
      throw new SurveyIsNotActiveException();
    } else if (!processedSurvey.version.valid) {
      throw new SurveyDesignWithErrorException();
    } else if (
      !preview &&
      !navData.allowIncomplete &&
      timeSinceStartMillis(response?.startDate ?? null) > navData.resumeExpiryMillis
    ) {
      throw new ResumeNotAllowedException();
    } else if (!navData.allowJump && direction === NAV_DIRECTION.JUMP) {
      throw new JumpNotAllowedException();
    } else if (!navData.allowPrevious && direction === NAV_DIRECTION.PREV) {
      throw new PreviousNotAllowedException();
    }

    const completeCount = await this.responses.completedCount(params.surveyId);
    this.validateForNavigation(survey, completeCount, preview);
    validateSchema(params.values, processedSurvey.output.schema);

    const lang = response?.lang
      ? availableLangByCode(
          processedSurvey.output.survey,
          params.navigationLang ?? response.lang,
        )
      : availableLangByCode(processedSurvey.output.survey, params.navigationLang);

    const mode: NavigationModeName =
      (params.navigationMode
        ? navigationModeFrom(params.navigationMode)
        : undefined) ??
      navModeFromIndex(response?.navigationIndex) ??
      navData.navigationMode;

    const navigationJsonOutput = await this.engine.navigate({
      values: JSON.stringify({ ...(response?.values ?? {}), ...params.values }),
      processedSurvey: JSON.stringify(processedSurvey.output),
      lang: lang.code,
      navigationMode: mode,
      navigationIndex: response?.navigationIndex ?? null,
      navigationDirection: params.navigationDirection,
      skipInvalid: navData.skipInvalid,
      surveyMode: params.surveyMode,
    });

    const others = [
      defaultSurveyLang(processedSurvey.output.survey),
      ...additionalLang(processedSurvey.output.survey),
    ].filter((l) => l.code !== lang.code);

    return { navigationJsonOutput, lang, additionalLang: others };
  }

  private validateForNavigation(
    survey: { status: string | null; startDate: string | null; endDate: string | null; quota: number },
    completeCount: number,
    preview: boolean,
  ): void {
    if (survey.status === 'CLOSED') throw new SurveyIsClosedException();
    if (preview) return;
    const now = nowUtcString();
    if (survey.startDate && now < survey.startDate) {
      throw new SurveyNotStartedException(survey.startDate);
    }
    if (survey.endDate && now > survey.endDate) {
      throw new SurveyExpiredException();
    }
    if (survey.quota >= 1 && survey.quota <= completeCount) {
      throw new SurveyQuotaExceededException();
    }
  }

}

function isActive(survey: {
  status: string | null;
  startDate: string | null;
  endDate: string | null;
}): boolean {
  const now = nowUtcString();
  return (
    survey.status === 'ACTIVE' &&
    (survey.endDate == null || survey.endDate > now) &&
    (survey.startDate == null || survey.startDate < now)
  );
}

/**
 * Elapsed time since the *response* was started: now − startDate (0 if none).
 *
 * We deliberately measure how long ago *this response* began, which is what
 * `resumeExpiryMillis` actually gates. Computing `survey.startDate − now`
 * instead would be wrong two ways — inverted sign (a started survey yields a
 * negative value) and the wrong field (the survey's open time, shared by all
 * respondents, not this response's) — so the resume-expiry guard would never
 * fire. Do not "simplify" by flipping this back.
 */
function timeSinceStartMillis(startDate: string | null): number {
  if (!startDate) return 0;
  return Date.now() - wallClockToInstant(startDate);
}

/** Derive the navigation mode from a stored index (≈ `NavigationIndex.navigationMode`). */
function navModeFromIndex(
  index: NavigationIndexJson | null | undefined,
): NavigationModeName | undefined {
  switch (index?.name) {
    case 'groups':
      return 'ALL_IN_ONE';
    case 'group':
      return 'GROUP_BY_GROUP';
    case 'question':
      return 'QUESTION_BY_QUESTION';
    default:
      return undefined;
  }
}
