import { MigrationInterface, QueryRunner } from 'typeorm';

export class DesignSnapshots0000000000004 implements MigrationInterface {
  name = 'DesignSnapshots0000000000004';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE design_snapshots (
          id uuid NOT NULL,
          survey_id uuid NOT NULL,
          saved_at timestamp without time zone NOT NULL,
          created_by uuid,
          data text NOT NULL,
          CONSTRAINT design_snapshots_pkey PRIMARY KEY (id),
          CONSTRAINT fk_design_snapshots_survey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_design_snapshots_survey_saved ON design_snapshots USING btree (survey_id, saved_at DESC);

      ALTER TABLE versions ADD COLUMN last_modified_by uuid;
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS design_snapshots`);
    await q.query(`ALTER TABLE versions DROP COLUMN IF EXISTS last_modified_by`);
  }
}
