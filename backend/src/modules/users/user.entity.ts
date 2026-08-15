import { Column, Entity, PrimaryColumn } from 'typeorm';
import { timestampTextTransformer } from '../../common/datetime';

/**
 * The tenant `users` table. No `schema` on @Entity — queries run against the
 * request's search_path (the tenant schema pinned by the TenantInterceptor).
 */
@Entity('users')
export class UserEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column()
  email: string;

  // Never returned by default — must be explicitly selected for auth checks.
  @Column({ select: false })
  password: string;

  @Column()
  deleted: boolean;

  @Column('varchar', { array: true })
  roles: string[];

  @Column({ name: 'is_confirmed', default: true })
  isConfirmed: boolean;

  // Stored as a UTC wall clock ("yyyy-MM-dd HH:mm:ss"), like every other date
  // column.
  @Column({
    name: 'last_login',
    type: 'timestamp',
    nullable: true,
    transformer: timestampTextTransformer,
  })
  lastLogin: string | null;
}
