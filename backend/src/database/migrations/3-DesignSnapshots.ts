import { MigrationInterface, QueryRunner } from 'typeorm';

export class DesignSnapshots0000000000003 implements MigrationInterface {
  name = 'DesignSnapshots0000000000003';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE design_snapshots (
          id uuid NOT NULL,
          survey_id uuid NOT NULL,
          created_at timestamp without time zone NOT NULL,
          created_by uuid,
          reason character varying(32) NOT NULL,
          details jsonb,
          data text NOT NULL,
          CONSTRAINT design_snapshots_pkey PRIMARY KEY (id),
          CONSTRAINT fk_design_snapshots_survey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_design_snapshots_survey_created ON design_snapshots USING btree (survey_id, created_at DESC);
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS design_snapshots`);
  }
}
