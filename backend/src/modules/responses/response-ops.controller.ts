import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MAX_RESPONSE_UPLOAD_BYTES, uploadLimits } from '../../common/upload';
import { assertEventTimes } from '../../common/datetime';
import { CurrentUser } from '../../auth/current-user.decorator';
import { CurrentUserPrincipal } from '../../auth/jwt.types';
import { Public } from '../../auth/public.decorator';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { FileDownload } from '../../integrations/filesystem/file-info';
import {
  ResponseCountDto,
  ResponseUploadFile,
  UploadResponseRequestData,
} from './response.dto';
import { ResponseOpsService } from './response-ops.service';

interface UploadedResource {
  originalname: string;
  mimetype?: string;
  size: number;
  buffer: Buffer;
}

const THIRTY_DAYS = 30 * 24 * 60 * 60;

function streamFile(res: Response, file: FileDownload, disposition?: string): void {
  res.setHeader('Content-Type', file.contentType);
  if (file.contentLength != null) res.setHeader('Content-Length', file.contentLength);
  res.setHeader('Cache-Control', `max-age=${THIRTY_DAYS}`);
  if (file.eTag) res.setHeader('ETag', file.eTag);
  if (disposition) res.setHeader('Content-Disposition', disposition);
  file.body.pipe(res);
}

/**
 * Response file up/download (engine-independent subset). The respondent-facing
 * attach up/download are public (tenant from the survey); the offline-sync
 * routes are role-gated. `uploadOfflineSurveyResponse`
 * navigates via the engine and is deferred to Phase 5.
 */
@Controller('survey')
export class ResponseOpsController {
  constructor(private readonly ops: ResponseOpsService) {}

  @Public()
  @Post(':surveyId/response/attach/:responseId/:questionId')
  @UseInterceptors(FileInterceptor('file', uploadLimits(MAX_RESPONSE_UPLOAD_BYTES)))
  uploadResponseFile(
    @Param('surveyId') surveyId: string,
    @Param('responseId') responseId: string,
    @Param('questionId') questionId: string,
    @UploadedFile() file: UploadedResource,
  ): Promise<ResponseUploadFile> {
    if (!file) throw new BadRequestException('file is required');
    return this.ops.uploadResponseFile(surveyId, responseId, questionId, false, file);
  }

  @Post(':surveyId/response/preview/attach/:responseId/:questionId')
  @UseInterceptors(FileInterceptor('file', uploadLimits(MAX_RESPONSE_UPLOAD_BYTES)))
  uploadPreviewFile(
    @Param('surveyId') surveyId: string,
    @Param('responseId') responseId: string,
    @Param('questionId') questionId: string,
    @UploadedFile() file: UploadedResource,
  ): Promise<ResponseUploadFile> {
    if (!file) throw new BadRequestException('file is required');
    return this.ops.uploadResponseFile(surveyId, responseId, questionId, true, file);
  }

  @Public()
  @Get(':surveyId/response/attach/:responseId/:questionId')
  async downloadFileNew(
    @Param('surveyId') surveyId: string,
    @Param('responseId') responseId: string,
    @Param('questionId') questionId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { download, displayName } = await this.ops.downloadFileNew(
      surveyId,
      responseId,
      questionId,
    );
    streamFile(res, download, `inline; filename="${displayName}"`);
  }

  @Public()
  @Get(':surveyId/response/:responseId/attach/:filename')
  async downloadFile(
    @Param('surveyId') surveyId: string,
    @Param('responseId') responseId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const download = await this.ops.downloadFile(surveyId, responseId, filename);
    streamFile(res, download);
  }

  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.SURVEYOR)
  @Post(':surveyId/response/:responseId/upload')
  @HttpCode(200)
  uploadOfflineSurveyResponse(
    @Param('surveyId') surveyId: string,
    @Param('responseId') responseId: string,
    @Body() body: UploadResponseRequestData,
    @CurrentUser() user: CurrentUserPrincipal,
  ): Promise<ResponseCountDto> {
    // `startDate`/`submitDate` arrive as the legacy LocalDateTime array form (no
    // `@JsonFormat`) and are normalized by the transformer; only the events carry
    // `@JsonFormat` wall-clock `time`s, so those are the ones to validate here.
    assertEventTimes(body.events);
    return this.ops.uploadOfflineSurveyResponse(surveyId, responseId, body, user.userId);
  }

  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.SURVEYOR)
  @Post(':surveyId/offline/response/:responseId/upload/:fileName')
  @UseInterceptors(FileInterceptor('file', uploadLimits(MAX_RESPONSE_UPLOAD_BYTES)))
  uploadOfflineFile(
    @Param('surveyId') surveyId: string,
    @Param('responseId') responseId: string,
    @Param('fileName') fileName: string,
    @UploadedFile() file: UploadedResource,
  ): Promise<ResponseUploadFile> {
    if (!file) throw new BadRequestException('file is required');
    return this.ops.uploadOfflineResponseFile(surveyId, responseId, fileName, file);
  }

  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.SURVEYOR)
  @Post(':surveyId/offline/response/:responseId/upload/:filename/exists')
  // Send a JSON boolean (Nest would otherwise send a bare boolean as text/html,
  // which the frontend can't read as a boolean — the client expects application/json).
  @Header('Content-Type', 'application/json')
  isOfflineFileUploaded(
    @Param('surveyId') surveyId: string,
    @Param('responseId') responseId: string,
    @Param('filename') filename: string,
  ): Promise<boolean> {
    return this.ops.isOfflineFileAlreadyUploaded(surveyId, responseId, filename);
  }
}
