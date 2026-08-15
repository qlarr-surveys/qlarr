import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { CurrentUserPrincipal } from '../../auth/jwt.types';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { SurveyDashboardService } from './dashboard.service';
import { OfflineSurveyDto, SurveysDto } from './survey.dto';

const toInt = (v?: string): number | undefined => {
  if (v == null) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};

@Controller('survey')
export class DashboardController {
  constructor(private readonly dashboard: SurveyDashboardService) {}

  /** Paginated survey list. Single-org: every survey is visible to any
   * authenticated user. */
  @Get('all')
  getAll(
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('sort_by') sortBy?: string,
    @Query('status') status?: string,
  ): Promise<SurveysDto> {
    return this.dashboard.getAllSurveys(toInt(page), toInt(perPage), sortBy, status);
  }

  @Get('offline')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.SURVEYOR)
  surveysForOffline(
    @CurrentUser() user: CurrentUserPrincipal,
  ): Promise<OfflineSurveyDto[]> {
    return this.dashboard.surveysForOffline(user.userId);
  }
}
