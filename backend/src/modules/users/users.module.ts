import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { EmailModule } from '../../integrations/email/email.module';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { AdminSeeder } from './admin-seeder';
import { EmailChangeEntity } from './email-change.entity';
import { EmailChangeRepository } from './email-change.repository';
import { LogoutController } from './logout.controller';
import { RefreshTokenEntity } from './refresh-token.entity';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UserManagementController } from './user-management.controller';
import { UserEntity } from './user.entity';
import { UserRepository } from './user.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  // forFeature registers entity metadata with the DataSource so repositories can
  // be built for these entities.
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RefreshTokenEntity,
      EmailChangeEntity,
    ]),
    AuthModule,
    EmailModule,
  ],
  controllers: [
    UsersController,
    AccessController,
    UserManagementController,
    LogoutController,
  ],
  providers: [
    UsersService,
    UserRepository,
    RefreshTokenRepository,
    EmailChangeRepository,
    AccessService,
    AdminSeeder,
  ],
})
export class UsersModule {}
