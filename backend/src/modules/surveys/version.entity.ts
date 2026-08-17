import { Column, Entity, PrimaryColumn, ValueTransformer } from 'typeorm';
import { timestampTextTransformer } from '../../common/datetime';

/**
 * `schema` is a TEXT column holding a JSON array (a list of ResponseField). We
 * don't model ResponseField here — nothing in the survey-metadata paths reads
 * its contents — so it round-trips as `unknown[]`.
 */
const schemaTransformer: ValueTransformer = {
  to: (value: unknown[]): string => JSON.stringify(value ?? []),
  from: (value: string | null): unknown[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
};

/** The tenant `versions` table. Composite PK (version, survey_id). */
@Entity('versions')
export class VersionEntity {
  @PrimaryColumn('int')
  version: number;

  @PrimaryColumn({ name: 'survey_id', type: 'uuid' })
  surveyId: string;

  @Column({ name: 'sub_version', type: 'int' })
  subVersion: number;

  @Column({ type: 'boolean' })
  valid: boolean;

  @Column({ type: 'boolean' })
  published: boolean;

  @Column({ type: 'text', transformer: schemaTransformer })
  schema: unknown[];

  // NOT NULL in the schema — every write path sets it (nowUtcString()), so the
  // entity matches the column rather than claiming a nullability the DB rejects.
  @Column({
    name: 'last_modified',
    type: 'timestamp',
    transformer: timestampTextTransformer,
  })
  lastModified: string;
}
