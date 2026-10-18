import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import {
  CalculationsStateDto,
  SaveCalculationsRequest,
  TestCalculationsResponse,
} from './calculations.dto';
import { CalculationsService } from './calculations.service';

/** The Calculated fields tab: state, Test, Save and Compute. */
@Controller('survey')
export class CalculationsController {
  constructor(private readonly calculations: CalculationsService) {}

  @Get(':surveyId/calculations')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  getState(@Param('surveyId') surveyId: string): Promise<CalculationsStateDto> {
    return this.calculations.getState(surveyId);
  }

  @Post(':surveyId/calculations/test')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  test(@Param('surveyId') surveyId: string): Promise<TestCalculationsResponse> {
    return this.calculations.test(surveyId);
  }

  @Put(':surveyId/calculations')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  save(
    @Param('surveyId') surveyId: string,
    @Body() body: SaveCalculationsRequest,
  ): Promise<CalculationsStateDto> {
    return this.calculations.save(surveyId, body.calculations, body.revision);
  }

  @Post(':surveyId/calculations/compute')
  @HttpCode(200)
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  compute(@Param('surveyId') surveyId: string): Promise<CalculationsStateDto> {
    return this.calculations.compute(surveyId);
  }
}
