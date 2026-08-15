import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The tenant `email_changes` table: a pending email change + its PIN, keyed by
 * the user. One row per user (PK = user_id). */
@Entity('email_changes')
export class EmailChangeEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'new_email' })
  newEmail: string;

  @Column()
  pin: string;
}
