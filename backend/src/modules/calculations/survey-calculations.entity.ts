import { Column, Entity, PrimaryColumn } from 'typeorm';
import { timestampTextTransformer } from '../../common/datetime';
import { Calculation } from '../../engine/engine.types';

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

  /** Goes up by one whenever the results are cleared; a Compute writes only
   *  while the value it started with is current. */
  @Column({ name: 'results_epoch', type: 'int' })
  resultsEpoch: number;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    nullable: true,
    transformer: timestampTextTransformer,
  })
  updatedAt: string | null;
}
