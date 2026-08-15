import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { assertWallClock } from '../../common/datetime';
import { EditSurveyRequest, SurveyDTO } from './survey.dto';
import { SurveysService } from './surveys.service';

/**
 * Survey metadata + clone + export endpoints. `create` and `import` live in
 * `SurveyCreateController`. The legacy `generate_ai` endpoint is deprecated and
 * intentionally not ported.
 *
 * Mutations require the survey_admin/super_admin role via the global RolesGuard.
 */
@Controller('survey')
export class SurveyController {
  constructor(private readonly surveys: SurveysService) {}

  @Post(':surveyId/clone')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  @HttpCode(200)
  clone(@Param('surveyId') surveyId: string): Promise<SurveyDTO> {
    return this.surveys.clone(surveyId);
  }

  @Get(':surveyId/export')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  async export(
    @Param('surveyId') surveyId: string,
    @Res() res: Response,
  ): Promise<void> {
    const zip = await this.surveys.exportSurvey(surveyId);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `inline; filename="${surveyId}.zip"`);
    res.send(zip);
  }

  @Get(':surveyId')
  get(@Param('surveyId') surveyId: string): Promise<SurveyDTO> {
    return this.surveys.getSurveyById(surveyId);
  }

  @Put(':surveyId')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  edit(
    @Param('surveyId') surveyId: string,
    @Body() body: EditSurveyRequest,
  ): Promise<SurveyDTO> {
    assertWallClock(body.startDate, 'startDate');
    assertWallClock(body.endDate, 'endDate');
    return this.surveys.edit(surveyId, body);
  }

  @Put(':surveyId/close')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  close(@Param('surveyId') surveyId: string): Promise<SurveyDTO> {
    return this.surveys.close(surveyId);
  }

  @Delete(':surveyId')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  @HttpCode(204)
  delete(@Param('surveyId') surveyId: string): Promise<void> {
    return this.surveys.delete(surveyId);
  }
}
