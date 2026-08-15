import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../auth/public.decorator';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { AutoCompleteFileInfo } from '../../integrations/filesystem/file-info';
import { AutoCompleteService } from './autocomplete.service';
import { SurveyResourceService } from './survey-resource.service';

/** Uploaded file shape from Multer's memory storage. */
interface UploadedResource {
  originalname: string;
  mimetype?: string;
  size: number;
  buffer: Buffer;
}

@Controller('survey')
export class AutoCompleteController {
  constructor(private readonly autocomplete: AutoCompleteService) {}

  // Public respondent-facing search. Tenant comes from the surveyId in the path.
  @Public()
  @Get(':surveyId/autocomplete/:filename')
  search(
    @Param('surveyId') surveyId: string,
    @Param('filename') filename: string,
    @Query('q') q = '',
    @Query('limit') limit = '10',
  ): Promise<string[]> {
    const n = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    return this.autocomplete.search(surveyId, filename, q, n);
  }
}

/**
 * Design-time autocomplete management: read a component's stored values, or
 * upload a new value list for it. Top-level route
 * (not under `/survey`), admin-only + survey permission.
 */
@Controller('autocomplete')
export class AutoCompleteAdminController {
  constructor(
    private readonly autocomplete: AutoCompleteService,
    private readonly resources: SurveyResourceService,
  ) {}

  @Get(':surveyId/:componentId')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  getValues(
    @Param('surveyId') surveyId: string,
    @Param('componentId') componentId: string,
  ): Promise<string[]> {
    return this.autocomplete.getAutoCompleteValues(surveyId, componentId);
  }

  @Post(':surveyId/:componentId')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('surveyId') surveyId: string,
    @Param('componentId') componentId: string,
    @UploadedFile() file: UploadedResource,
  ): Promise<AutoCompleteFileInfo> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.resources.uploadAutoCompleteResource(surveyId, componentId, file);
  }
}
