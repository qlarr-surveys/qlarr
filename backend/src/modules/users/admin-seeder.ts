import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../auth/role.enum';
import { AppConfig } from '../../config/app.config';
import { DbContext } from '../../database/db-context';
import { UserEntity } from './user.entity';
import { rolesToDb } from './user-roles';

/**
 * Seeds the initial admin (`admin@admin.admin`, SUPER_ADMIN) on startup when the
 * users table is empty — the open-source replacement for self-service signup.
 * Port of the Kotlin `UserService.createFirstUser` / `DataInitializer`.
 *
 * Always runs (there is no way in, otherwise); the password comes from
 * `SEED_ADMIN_PASSWORD` (default "admin"). No-op once any user exists.
 */
@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    private readonly db: DbContext,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const repo = this.db.manager.getRepository(UserEntity);
    if ((await repo.count()) > 0) return;

    const password = this.config.getOrThrow<AppConfig>('app').seedAdminPassword;
    await repo.insert({
      id: randomUUID(),
      firstName: 'admin',
      lastName: 'admin',
      email: 'admin@admin.admin',
      password: await bcrypt.hash(password, 10),
      deleted: false,
      roles: rolesToDb([Role.SUPER_ADMIN]),
      isConfirmed: true,
      lastLogin: null,
    });
    this.logger.log('Seeded initial admin user (admin@admin.admin)');
  }
}
