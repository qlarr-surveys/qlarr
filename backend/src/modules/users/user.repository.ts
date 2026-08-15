import { Injectable } from '@nestjs/common';
import { DeepPartial, Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/db-errors';
import { DbContext } from '../../database/db-context';
import { CountByRoleResponse } from './user.dto';
import { UserEntity } from './user.entity';
import { DuplicateEmailException } from './user.exceptions';

/**
 * Data-access for the `users` table. Resolves the repository per call
 * from the request-scoped manager, so every query runs against the database —
 * the service never touches the EntityManager directly.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly db: DbContext) {}

  private get repo(): Repository<UserEntity> {
    return this.db.manager.getRepository(UserEntity);
  }

  /** Active user by id (soft-deleted rows excluded). */
  findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id, deleted: false } });
  }

  /** By id WITHOUT the deleted filter. */
  findByIdIncludingDeleted(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Active user by id with the (normally hidden) password column selected. */
  findByIdWithPassword(id: string): Promise<UserEntity | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id AND u.deleted = false', { id })
      .getOne();
  }

  /** Active user by email. */
  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email, deleted: false } });
  }

  /** Active user by email with the (normally hidden) password column (login). */
  findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email AND u.deleted = false', { email })
      .getOne();
  }

  /** All active users. */
  findAllActive(): Promise<UserEntity[]> {
    return this.repo.find({ where: { deleted: false } });
  }

  /** Build an unsaved UserEntity instance. */
  create(data: DeepPartial<UserEntity>): UserEntity {
    return this.repo.create(data);
  }

  /** Insert a new user; maps the unique-email constraint to a typed error. */
  async insert(user: UserEntity): Promise<void> {
    try {
      await this.repo.insert(user);
    } catch (err) {
      if (isUniqueViolation(err)) throw new DuplicateEmailException();
      throw err;
    }
  }

  /**
   * Persist changes to an existing user. Maps the unique-email collision to a
   * typed error too (an email edit can race the same constraint as insert), so
   * both write paths surface DuplicateEmailException rather than a raw 500.
   */
  async save(user: UserEntity): Promise<UserEntity> {
    try {
      return await this.repo.save(user);
    } catch (err) {
      if (isUniqueViolation(err)) throw new DuplicateEmailException();
      throw err;
    }
  }

  /** Role counts (raw SQL over the roles array column). */
  async countByRole(): Promise<CountByRoleResponse> {
    const rows: Array<{
      superadmin: string;
      surveyadmin: string;
      surveyor: string;
    }> = await this.db.manager.query(
      `select
         count(*) filter (where cast(roles as varchar) like '%SUPER_ADMIN%') as superAdmin,
         count(*) filter (where cast(roles as varchar) like '%SURVEY_ADMIN%') as surveyAdmin,
         count(*) filter (where cast(roles as varchar) like '%{SURVEYOR,%'
                            or cast(roles as varchar) like '%SURVEYOR}%'
                            or cast(roles as varchar) like '%,SURVEYOR,%') as surveyor
       from users`,
    );
    const row = rows[0] ?? { superadmin: '0', surveyadmin: '0', surveyor: '0' };
    return {
      superAdmin: Number(row.superadmin),
      surveyAdmin: Number(row.surveyadmin),
      surveyor: Number(row.surveyor),
    };
  }
}
