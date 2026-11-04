import { Column, Entity, PrimaryColumn } from 'typeorm';
import { timestampTextTransformer } from '../../common/datetime';
import {
  SurveyNavigationData,
  navigationDataTransformer,
} from './survey-navigation-data';

/** The tenant `surveys` table (queried via the tenant-scoped manager). */
@Entity('surveys')
export class SurveyEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'can_lock_survey' })
  canLockSurvey: boolean;

  @Column({
    name: 'creation_date',
    type: 'timestamp',
    nullable: true,
    transformer: timestampTextTransformer,
  })
  creationDate: string | null;

  @Column({
    name: 'last_modified',
    type: 'timestamp',
    nullable: true,
    transformer: timestampTextTransformer,
  })
  lastModified: string | null;

  @Column({
    name: 'start_date',
    type: 'timestamp',
    nullable: true,
    transformer: timestampTextTransformer,
  })
  startDate: string | null;

  @Column({
    name: 'end_date',
    type: 'timestamp',
    nullable: true,
    transformer: timestampTextTransformer,
  })
  endDate: string | null;

  @Column()
  name: string;

  @Column()
  quota: number;

  @Column({ type: 'varchar', nullable: true })
  status: string | null;

  @Column({ type: 'varchar', nullable: true })
  usage: string | null;

  @Column({ name: 'record_gps' })
  recordGps: boolean;

  @Column({ name: 'save_ip' })
  saveIp: boolean;

  @Column({ name: 'save_timings' })
  saveTimings: boolean;

  @Column({ name: 'background_audio' })
  backgroundAudio: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  image: string | null;

  @Column({
    name: 'navigation_data',
    type: 'text',
    nullable: true,
    transformer: navigationDataTransformer,
  })
  navigationData: SurveyNavigationData;
}
