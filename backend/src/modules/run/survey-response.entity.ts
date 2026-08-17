import { Column, Entity, PrimaryColumn, ValueTransformer } from 'typeorm';
import { timestampTextTransformer } from '../../common/datetime';
import { NavigationIndexJson } from '../../engine/engine.types';

/** `nav_index` is TEXT holding the NavigationIndex JSON. */
const navIndexTransformer: ValueTransformer = {
  to: (value: NavigationIndexJson | null): string | null =>
    value ? JSON.stringify(value) : null,
  from: (value: string | null): NavigationIndexJson | null =>
    value ? (JSON.parse(value) as NavigationIndexJson) : null,
};

/**
 * The tenant `responses` table. `values` + `events` are JSONB; `nav_index` is
 * JSON-in-TEXT; `survey_response_index` is assigned by a DB trigger and is
 * therefore read-only from the app.
 */
@Entity('responses')
export class SurveyResponseEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ name: 'survey_id', type: 'uuid' })
  surveyId: string;

  @Column({ type: 'boolean' })
  preview: boolean;

  @Column({ type: 'uuid', nullable: true })
  surveyor: string | null;

  // NOT NULL in the schema. Kept `| null` on the TS type because the transformer
  // still tolerates a null in-flight value (see run.service), but the column
  // itself is non-nullable — no `nullable: true` here, matching the migration.
  @Column({ name: 'nav_index', type: 'text', transformer: navIndexTransformer })
  navigationIndex: NavigationIndexJson | null;

  @Column({
    name: 'start_date',
    type: 'timestamp',
    transformer: timestampTextTransformer,
  })
  startDate: string;

  @Column({
    name: 'submit_date',
    type: 'timestamp',
    nullable: true,
    transformer: timestampTextTransformer,
  })
  submitDate: string | null;

  @Column({ type: 'varchar', length: 5 })
  lang: string;

  @Column({ name: 'ip_addr', type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'jsonb' })
  events: unknown[];

  // Nullable in the schema (`"values" jsonb` with no NOT NULL) — legacy rows can
  // hold SQL NULL even though every current write path stores `?? {}`. Modelled
  // nullable so reads are sound; callers already default it (`?? {}`).
  @Column({ type: 'jsonb', nullable: true })
  values: Record<string, unknown> | null;

  // Assigned by the assign_survey_response_index() trigger — read-only.
  @Column({
    name: 'survey_response_index',
    type: 'int',
    nullable: true,
    insert: false,
    update: false,
  })
  surveyResponseIndex: number | null;
}
