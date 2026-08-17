import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Public } from '../../auth/public.decorator';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { FileInfo } from '../../integrations/filesystem/file-info';
import { SurveyResourceService } from './survey-resource.service';

/** Uploaded file shape from Multer's memory storage. */
interface UploadedResource {
  originalname: string;
  mimetype?: string;
  size: number;
  buffer: Buffer;
}

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

/**
 * Survey resource endpoints. Upload/delete need super_admin/survey_admin AND
 * survey permission; download is public
 * (respondent-facing) and resolves the tenant from the surveyId.
 */
@Controller('survey')
export class SurveyResourceController {
  constructor(private readonly resources: SurveyResourceService) {}

  @Post(':surveyId/resource')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('surveyId') surveyId: string,
    @UploadedFile() file: UploadedResource,
  ): Promise<FileInfo> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.resources.uploadResource(surveyId, file);
  }

  @Public()
  @Get(':surveyId/resource/:fileName')
  async download(
    @Param('surveyId') surveyId: string,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.resources.downloadResource(surveyId, fileName);
    res.setHeader('Content-Type', file.contentType);
    if (file.contentLength != null) {
      res.setHeader('Content-Length', file.contentLength);
    }
    res.setHeader('Cache-Control', `max-age=${THIRTY_DAYS_SECONDS}`);
    if (file.eTag) {
      res.setHeader('ETag', file.eTag);
    }
    file.body.pipe(res);
  }

  @Delete(':surveyId/resource/:fileName')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  async delete(
    @Param('surveyId') surveyId: string,
    @Param('fileName') fileName: string,
  ): Promise<{ message: string }> {
    await this.resources.removeResource(surveyId, fileName);
    return { message: 'Survey resource deleted Successfully' };
  }
}
