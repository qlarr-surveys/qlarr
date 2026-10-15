import { Column, Entity, PrimaryColumn } from 'typeorm';
import { timestampTextTransformer } from '../../common/datetime';
import { Calculation } from '../../engine/engine.types';

/**
 * The Compute run state: `idle` (never computed), `running`, `completed` (the
 * last run finished) or `failed` (it timed out, crashed or was cut off by a
 * restart).
 */
export type CalculationStatus = 'idle' | 'running' | 'completed' | 'failed';

/**
 * The `survey_calculations` table: one row per survey, created on the first
 * save (or by clone/import). Kept off the `surveys` row so a TypeORM `save()` of
 * a survey can never write a stale set back.
 */
@Entity('survey_calculations')
export class SurveyCalculationsEntity {
  @PrimaryColumn({ name: 'survey_id', type: 'uuid' })
  surveyId: string;

  /** The validated set, in the order the calculations were added. */
  @Column({ type: 'jsonb' })
  calculations: Calculation[];

  /** Goes up by one on every save; the optimistic-locking token. */
  @Column({ type: 'int' })
  revision: number;

  @Column({ type: 'text' })
  status: CalculationStatus;

  @Column({ name: 'progress_done', type: 'int' })
  progressDone: number;

  @Column({ name: 'progress_total', type: 'int' })
  progressTotal: number;

  /** When the current or last run started. For display only: a run identifies
   *  itself by the full-precision value `startRun` returns. */
  @Column({
    name: 'started_at',
    type: 'timestamp',
    nullable: true,
    transformer: timestampTextTransformer,
  })
  startedAt: string | null;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    nullable: true,
    transformer: timestampTextTransformer,
  })
  updatedAt: string | null;
}
