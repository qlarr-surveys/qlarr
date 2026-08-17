import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import {
  DesignDiffDto,
  DesignDto,
  PublishInfo,
  VersionDto,
} from './design.dto';
import { DesignService } from './design.service';

/**
 * Survey design endpoints (the edit-loop subset).
 * super_admin/survey_admin + survey permission. `change_code`, `publish` and
 * the offline diff land in the next slice.
 */
@Controller('survey')
export class DesignController {
  constructor(private readonly design: DesignService) {}

  @Get(':surveyId/design')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  getDesign(@Param('surveyId') surveyId: string): Promise<DesignDto> {
    return this.design.getDesign(surveyId);
  }

  @Post(':surveyId/offline/design')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.SURVEYOR)
  offlineDesignDiff(
    @Param('surveyId') surveyId: string,
    @Body() publishInfo: PublishInfo,
  ): Promise<DesignDiffDto> {
    return this.design.offlineDesignDiff(surveyId, publishInfo);
  }

  @Post(':surveyId/design')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  setDesign(
    @Param('surveyId') surveyId: string,
    @Body() design: Record<string, unknown>,
    @Query('version') version: string,
  ): Promise<DesignDto> {
    return this.design.setDesign(surveyId, design, parseInt(version, 10));
  }

  @Post(':surveyId/change_code')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  changeCode(
    @Param('surveyId') surveyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<DesignDto> {
    return this.design.changeCode(surveyId, from, to);
  }

  @Post(':surveyId/design/publish')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  publish(
    @Param('surveyId') surveyId: string,
    @Query('version') version: string,
    @Query('sub_version') subVersion: string,
  ): Promise<VersionDto> {
    return this.design.publish(surveyId, parseInt(version, 10), parseInt(subVersion, 10));
  }
}
