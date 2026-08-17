import { Controller, Get, Param } from '@nestjs/common';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { ResponseDto, ResponseEventDto } from './response.dto';
import { ResponseService } from './response.service';

/**
 * Single-response reads (getResponse/getResponseWithEvent). Keyed by response id
 * alone; access is gated by the caller's role via the global RolesGuard.
 */
@Controller()
export class ResponseReadController {
  constructor(private readonly responses: ResponseService) {}

  @Get('response/:responseId')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  getResponse(@Param('responseId') responseId: string): Promise<ResponseDto> {
    return this.responses.getResponse(responseId);
  }

  @Get('response_with_event/:responseId')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  getResponseWithEvent(
    @Param('responseId') responseId: string,
  ): Promise<ResponseEventDto[]> {
    return this.responses.getResponseWithEvents(responseId);
  }
}
