import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { IsString } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentUserPrincipal } from '../auth/jwt.types';
import { JobFailuresDto, JobStatusDto, JobsService, SubjectJobDto } from './jobs.service';

const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 100;

/** A subject of a kind. `''` is a valid subject, hence the body, not the path. */
export class JobSubjectDto {
  @IsString()
  kind!: string;

  @IsString()
  subjectKey!: string;
}

/** `n` as a positive integer, else `fallback`. */
const toPositiveInt = (v: string | undefined, fallback: number): number => {
  const n = v == null ? NaN : parseInt(v, 10);
  return Number.isNaN(n) || n < 1 ? fallback : n;
};

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

  /** Retry the subject's failed responses; 409 if there are none. */
  @Post(':surveyId/jobs/retry')
  @HttpCode(200)
  retry(
    @Param('surveyId', ParseUUIDPipe) surveyId: string,
    @Body() body: JobSubjectDto,
    @CurrentUser() user: CurrentUserPrincipal,
  ): Promise<JobStatusDto> {
    return this.jobs.retry(surveyId, body.kind, body.subjectKey, user.authorities);
  }

  /** A page of the subject's failed responses. */
  @Get(':surveyId/jobs/failures')
  failures(
    @Param('surveyId', ParseUUIDPipe) surveyId: string,
    @Query() subject: JobSubjectDto,
    @Query('page') page: string | undefined,
    @Query('perPage') perPage: string | undefined,
    @CurrentUser() user: CurrentUserPrincipal,
  ): Promise<JobFailuresDto> {
    return this.jobs.listFailures(
      surveyId,
      subject.kind,
      subject.subjectKey,
      toPositiveInt(page, 1),
      Math.min(toPositiveInt(perPage, DEFAULT_PER_PAGE), MAX_PER_PAGE),
      user.authorities,
    );
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
