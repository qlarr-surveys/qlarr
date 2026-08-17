import { Controller, Get, NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { CurrentUserPrincipal } from '../../auth/jwt.types';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Current user's profile, read from the caller's tenant schema. */
  @Get('me')
  async me(@CurrentUser() principal: CurrentUserPrincipal) {
    const user = await this.users.findById(principal.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
