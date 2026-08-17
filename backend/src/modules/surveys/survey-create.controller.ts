import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { SurveyCreateRequest, SurveyDTO } from './survey.dto';
import { SurveysService } from './surveys.service';

/** The uploaded export ZIP (multer memory storage). */
interface UploadedZip {
  buffer: Buffer;
}

/**
 * `POST /survey/create` and `POST /survey/import` — neither has a source survey
 * to authorize against, so both are role-gated only (super_admin/survey_admin),
 * separate from the permission-guarded `SurveyController`.
 */
@Controller('survey')
export class SurveyCreateController {
  constructor(private readonly surveys: SurveysService) {}

  @Post('create')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  @HttpCode(200)
  create(@Body() body: SurveyCreateRequest): Promise<SurveyDTO> {
    return this.surveys.create(body);
  }

  @Post('import')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  import(@UploadedFile() file: UploadedZip): Promise<SurveyDTO> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.surveys.importSurvey(file.buffer);
  }
}
