import { Column, Entity, PrimaryColumn } from 'typeorm';
import { timestampTextTransformer } from '../../common/datetime';

export enum SnapshotReason {
  TIMER = 'TIMER',
  DELETE = 'DELETE',
  TRANSLATIONS_IMPORT = 'TRANSLATIONS_IMPORT',
  CHANGE_CODE = 'CHANGE_CODE',
  RESTORE = 'RESTORE',
}

@Entity('design_snapshots')
export class DesignSnapshotEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'survey_id', type: 'uuid' })
  surveyId: string;

  @Column({ name: 'created_at', type: 'timestamp', transformer: timestampTextTransformer })
  createdAt: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', length: 32 })
  reason: SnapshotReason;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @Column({ type: 'text', select: false })
  data: string;
}
