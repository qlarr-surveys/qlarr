import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { assertEventTimes, assertWallClock } from '../../common/datetime';
import { Public } from '../../auth/public.decorator';
import { getClientIp } from '../../common/http';
import { NavigateRequest, RunSurveyDto, StartRequest } from './run.dto';
import { RunService } from './run.service';

const toSurveyMode = (mode?: string): 'ONLINE' | 'OFFLINE' =>
  mode?.toLowerCase() === 'offline' ? 'OFFLINE' : 'ONLINE';

/**
 * Respondent-facing run endpoints. The `run/*`
 * routes are public (tenant from the survey); the `preview/*` routes are
 * permission-gated and let admins drive the working version in any survey mode.
 */
@Controller('survey')
export class RunController {
  constructor(private readonly run: RunService) {}

  @Public()
  @Post(':surveyId/run/start')
  @HttpCode(200)
  start(
    @Param('surveyId') surveyId: string,
    @Body() body: StartRequest,
    @Req() req: Request,
  ): Promise<RunSurveyDto> {
    assertWallClock(body.clientUTCTime, 'clientUTCTime');
    return this.run.start(surveyId, body, false, 'ONLINE', getClientIp(req));
  }

  @Post(':surveyId/preview/start')
  @HttpCode(200)
  startPreview(
    @Param('surveyId') surveyId: string,
    @Query('mode') mode: string | undefined,
    @Body() body: StartRequest,
    @Req() req: Request,
  ): Promise<RunSurveyDto> {
    assertWallClock(body.clientUTCTime, 'clientUTCTime');
    return this.run.start(surveyId, body, true, toSurveyMode(mode), getClientIp(req));
  }

  @Public()
  @Post(':surveyId/run/navigate')
  @HttpCode(200)
  navigate(
    @Param('surveyId') surveyId: string,
    @Body() body: NavigateRequest,
  ): Promise<RunSurveyDto> {
    assertWallClock(body.clientUTCTime, 'clientUTCTime');
    assertEventTimes(body.events);
    return this.run.navigate(surveyId, body, false, 'ONLINE');
  }

  @Post(':surveyId/preview/navigate')
  @HttpCode(200)
  navigatePreview(
    @Param('surveyId') surveyId: string,
    @Query('mode') mode: string | undefined,
    @Body() body: NavigateRequest,
  ): Promise<RunSurveyDto> {
    assertWallClock(body.clientUTCTime, 'clientUTCTime');
    assertEventTimes(body.events);
    return this.run.navigate(surveyId, body, true, toSurveyMode(mode));
  }

  @Public()
  @Get(':surveyId/run/runtime.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  runtimeJs(@Param('surveyId') surveyId: string): Promise<string> {
    return this.run.runtimeJs(surveyId, false);
  }

  @Get(':surveyId/preview/runtime.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  runtimeJsPreview(@Param('surveyId') surveyId: string): Promise<string> {
    return this.run.runtimeJs(surveyId, true);
  }
}
