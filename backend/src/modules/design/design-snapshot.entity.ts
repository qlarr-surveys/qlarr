import { Column, Entity, PrimaryColumn } from 'typeorm';
import { timestampTextTransformer } from '../../common/datetime';

@Entity('design_snapshots')
export class DesignSnapshotEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'survey_id', type: 'uuid' })
  surveyId: string;

  @Column({ name: 'created_at', type: 'timestamp', transformer: timestampTextTransformer })
  createdAt: string;

  /** When the snapshotted design was last saved; `created_at` is when it was snapshotted. */
  @Column({ name: 'saved_at', type: 'timestamp', transformer: timestampTextTransformer })
  savedAt: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ type: 'text', select: false })
  data: string;
}
