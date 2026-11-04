import { Column, Entity, PrimaryColumn } from 'typeorm';
import { timestampTextTransformer } from '../../common/datetime';

@Entity('design_snapshots')
export class DesignSnapshotEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'survey_id', type: 'uuid' })
  surveyId: string;

  /** When the snapshotted design was last saved. */
  @Column({ name: 'saved_at', type: 'timestamp', transformer: timestampTextTransformer })
  savedAt: string;

  /** Who last saved the snapshotted design, not whose edit took the snapshot. */
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ type: 'text', select: false })
  data: string;
}
