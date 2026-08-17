import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../auth/current-user.decorator';
import { IdentityThrottlerGuard } from '../../auth/identity-throttler.guard';
import { CurrentUserPrincipal } from '../../auth/jwt.types';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { LoggedInUserResponse } from './access.dto';
import {
  ConfirmEmailRequest,
  CountByRoleResponse,
  CreateRequest,
  EditProfileRequest,
  EditUserRequest,
  UserDTO,
} from './user.dto';
import { UsersService } from './users.service';

/**
 * The authenticated user-management surface under `/user`.
 * Static routes are declared before the `:userId` params so
 * `/user/all`, `/user/create`, `/user/count_by_role`, `/user/profile`,
 * `/user/confirm_new_email` win over `/user/:userId`.
 *
 * Tenant is resolved from the caller's JWT (all routes authenticated).
 */
@Controller('user')
export class UserManagementController {
  constructor(private readonly users: UsersService) {}

  @Get('all')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  getAll(): Promise<UserDTO[]> {
    return this.users.getAllUsers();
  }

  @Get('count_by_role')
  @Roles(Role.SUPER_ADMIN)
  countByRole(): Promise<CountByRoleResponse> {
    return this.users.countUserRoles();
  }

  @Post('create')
  @Roles(Role.SUPER_ADMIN)
  create(@Body() body: CreateRequest): Promise<UserDTO> {
    return this.users.create(body);
  }

  // The 6-digit PIN is the lockout the guessing brake replaces: 5 tries / 15 min
  // per user makes a 1M-space brute force take years (keyed by user id — see
  // IdentityThrottlerGuard). A fresh email-change request mints a new PIN.
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @UseGuards(IdentityThrottlerGuard)
  @Post('confirm_new_email')
  confirmNewEmail(
    @CurrentUser() user: CurrentUserPrincipal,
    @Body() body: ConfirmEmailRequest,
  ): Promise<LoggedInUserResponse> {
    return this.users.confirmNewEmail(body, user);
  }

  @Put('profile')
  editProfile(
    @CurrentUser() user: CurrentUserPrincipal,
    @Body() body: EditProfileRequest,
  ): Promise<UserDTO> {
    return this.users.editProfile(body, user);
  }

  @Get(':userId')
  getById(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserDTO> {
    return this.users.getUserById(userId);
  }

  @Put(':userId')
  @Roles(Role.SUPER_ADMIN)
  edit(
    @CurrentUser() user: CurrentUserPrincipal,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: EditUserRequest,
  ): Promise<UserDTO> {
    return this.users.update(userId, body, user.userId);
  }

  @Delete(':userId')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(204)
  delete(
    @CurrentUser() user: CurrentUserPrincipal,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.users.delete(userId, user.userId);
  }
}
