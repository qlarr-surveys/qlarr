import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentUserPrincipal } from '../auth/jwt.types';
import { JobStatusDto, JobsService, SubjectJobDto } from './jobs.service';

/**
 * The endpoints every job kind shares. Each kind's roles apply. Starting a job
 * stays on the feature's own endpoint, which does the feature's checks.
 */
@Controller('survey')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get(':surveyId/jobs')
  list(
    @Param('surveyId', ParseUUIDPipe) surveyId: string,
    @CurrentUser() user: CurrentUserPrincipal,
  ): Promise<SubjectJobDto[]> {
    return this.jobs.list(surveyId, user.authorities);
  }

  @Post(':surveyId/jobs/:jobId/cancel')
  @HttpCode(200)
  cancel(
    @Param('surveyId', ParseUUIDPipe) surveyId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: CurrentUserPrincipal,
  ): Promise<JobStatusDto> {
    return this.jobs.cancel(surveyId, jobId, user.authorities);
  }
}
