import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { nowUtcString } from '../../common/datetime';
import { EngineService } from '../../engine/engine.service';
import { NavigationDirectionJson } from '../../engine/engine.types';
import { FILE_HELPER, FileHelper } from '../../integrations/filesystem/file-helper';
import { DesignService } from '../design/design.service';
import { SurveyEntity } from '../surveys/survey.entity';
import { SurveyIsNotActiveException } from '../surveys/survey.exceptions';
import { NavigationResult, NavigationService } from './navigation.service';
import { NavigateRequest, RunSurveyDto, StartRequest } from './run.dto';
import { ResponseNotFoundException } from '../responses/response.exceptions';
import { ResponseRepository } from '../responses/response.repository';
import { SurveyDesignWithErrorException } from './run.exceptions';
import { stringIndex, validateClientTimeSkew } from './run.helpers';

type SurveyMode = 'ONLINE' | 'OFFLINE';

/**
 * The respondent run flow: start a response,
 * advance it, and serve the runtime script. Navigation is delegated to
 * `NavigationService` (the validation gauntlet + engine); this service owns the
 * response persistence + timing events.
 */
@Injectable()
export class RunService {
  constructor(
    private readonly design: DesignService,
    private readonly engine: EngineService,
    private readonly navigation: NavigationService,
    private readonly responses: ResponseRepository,
    @Inject(FILE_HELPER) private readonly files: FileHelper,
  ) {}

  async start(
    surveyId: string,
    req: StartRequest,
    preview: boolean,
    surveyMode: SurveyMode,
    clientIp: string,
  ): Promise<RunSurveyDto> {
    validateClientTimeSkew(req.clientUTCTime);
    const processed = await this.design.getProcessedSurvey(surveyId, !preview);
    const result = await this.navigation.navigate({
      surveyId,
      response: null,
      processedSurvey: processed,
      navigationDirection: { name: 'START' },
      navigationMode: req.navigationMode,
      navigationLang: req.lang,
      values: req.values ?? {},
      preview,
      surveyMode,
    });

    const navIndex = result.navigationJsonOutput.navigationIndex;
    const events = processed.survey.saveTimings
      ? [
          navigationEvent(
            '',
            stringIndex(navIndex),
            { name: 'START' },
            req.clientUTCTime ?? nowUtcString(),
          ),
        ]
      : [];

    const entity = await this.responses.save({
      id: randomUUID(),
      surveyId,
      version: processed.version.version,
      preview,
      surveyor: null,
      navigationIndex: navIndex,
      startDate: nowUtcString(),
      submitDate: null,
      lang: result.lang.code,
      ipAddress: processed.survey.saveIp ? clientIp : null,
      events,
      values: result.navigationJsonOutput.toSave,
    });

    return toRunDto(entity.id, result, processed.survey);
  }

  async navigate(
    surveyId: string,
    req: NavigateRequest,
    preview: boolean,
    surveyMode: SurveyMode,
  ): Promise<RunSurveyDto> {
    validateClientTimeSkew(req.clientUTCTime);
    const processed = await this.design.getProcessedSurvey(surveyId, !preview);
    const response = await this.responses.findById(req.responseId);
    if (!response) throw new ResponseNotFoundException();

    const result = await this.navigation.navigate({
      surveyId,
      response,
      processedSurvey: processed,
      navigationDirection: req.navigationDirection,
      navigationMode: req.navigationMode,
      navigationLang: req.lang,
      values: { ...response.values, ...(req.values ?? {}) },
      preview,
      surveyMode,
    });

    const navIndex = result.navigationJsonOutput.navigationIndex;
    const isEnd = navIndex.name === 'end';
    const fromIndex = response.navigationIndex ? stringIndex(response.navigationIndex) : '';

    // Keep client events only when timings are saved, except Location / voice
    // recordings which are always kept.
    const incoming = (req.events ?? []).filter((e) => {
      const name = (e as { name?: string }).name;
      return processed.survey.saveTimings || name === 'Location' || name === 'VoiceRecording';
    });
    const events = [...response.events, ...incoming];
    if (processed.survey.saveTimings) {
      events.push(
        navigationEvent(
          fromIndex,
          stringIndex(navIndex),
          req.navigationDirection,
          req.clientUTCTime ?? nowUtcString(),
        ),
      );
    }

    response.navigationIndex = navIndex;
    response.lang = result.lang.code;
    response.submitDate = isEnd ? nowUtcString() : null;
    response.values = result.navigationJsonOutput.toSave;
    response.preview = preview;
    response.events = events;
    await this.responses.save(response);

    if (isEnd) {
      await this.files.deleteUnusedResponseFiles(
        surveyId,
        req.responseId,
        result.navigationJsonOutput.toSave,
        response.events,
      );
    }

    return toRunDto(req.responseId, result, processed.survey);
  }

  /**
   * The JS bundle a running survey loads: the shared runtime plus this survey's
   * compiled script. Live runs require the survey active + valid; preview uses
   * the working version and skips the active check.
   */
  async runtimeJs(surveyId: string, preview = false): Promise<string> {
    const processed = await this.design.getProcessedSurvey(surveyId, !preview);
    if (!preview && !isActive(processed.survey)) {
      throw new SurveyIsNotActiveException();
    }
    if (!processed.version.valid) {
      throw new SurveyDesignWithErrorException();
    }
    return `${this.engine.commonScript()}\n\n${processed.output.script}`;
  }
}

function navigationEvent(
  from: string,
  to: string,
  direction: NavigationDirectionJson,
  time: string,
): Record<string, unknown> {
  return { name: 'Navigation', from, to, direction, time };
}

function toRunDto(
  responseId: string,
  result: NavigationResult,
  survey: SurveyEntity,
): RunSurveyDto {
  return {
    survey: result.navigationJsonOutput.survey,
    state: result.navigationJsonOutput.state,
    navigationData: survey.navigationData,
    navigationIndex: result.navigationJsonOutput.navigationIndex,
    responseId,
    lang: result.lang,
    additionalLang: result.additionalLang,
    saveTimings: survey.saveTimings,
  };
}

/** status ACTIVE and within the [start, end] window (≈ `SurveyDTO.isActive`). */
function isActive(survey: SurveyEntity): boolean {
  const now = nowUtcString();
  return (
    survey.status === 'ACTIVE' &&
    (survey.endDate == null || survey.endDate > now) &&
    (survey.startDate == null || survey.startDate < now)
  );
}
