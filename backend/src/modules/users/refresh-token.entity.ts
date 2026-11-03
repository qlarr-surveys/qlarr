import { Column, Entity, PrimaryColumn } from 'typeorm';
import { timestampTextTransformer } from '../../common/datetime';

/**
 * Tenant `refresh_tokens` table: one row per session. `id` is the session's
 * current refresh token; a refresh swaps it in place (see AccessService.refresh).
 */
@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // UTC wall clock ("yyyy-MM-dd HH:mm:ss"), consistent with all date columns.
  // The session's hard cap, counted from login.
  @Column({ type: 'timestamp', transformer: timestampTextTransformer })
  expiration: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  /** The token this row held before its last rotation; null until the first. */
  @Column({ name: 'previous_id', type: 'uuid', nullable: true })
  previousId: string | null;

  /** UTC wall clock of the login or last rotation — drives the idle timeout. */
  @Column({
    name: 'last_used_at',
    type: 'timestamp',
    transformer: timestampTextTransformer,
  })
  lastUsedAt: string;
}
