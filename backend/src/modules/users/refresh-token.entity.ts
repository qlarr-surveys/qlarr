import { Column, Entity, PrimaryColumn } from 'typeorm';
import { timestampTextTransformer } from '../../common/datetime';

/** Tenant `refresh_tokens` table. */
@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // UTC wall clock ("yyyy-MM-dd HH:mm:ss"), consistent with all date columns.
  @Column({ type: 'timestamp', transformer: timestampTextTransformer })
  expiration: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;
}
