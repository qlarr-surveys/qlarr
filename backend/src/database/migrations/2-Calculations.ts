import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Calculated fields: one `survey_calculations` row per survey holding the
 * calculation set and its Compute run state, plus `responses.computations` for
 * the per-response results written by Compute.
 */
export class Calculations0000000000002 implements MigrationInterface {
  name = 'Calculations0000000000002';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE survey_calculations (
          survey_id uuid NOT NULL,
          calculations jsonb DEFAULT '[]' NOT NULL,
          revision integer DEFAULT 0 NOT NULL,
          status text DEFAULT 'idle' NOT NULL,
          progress_done integer DEFAULT 0 NOT NULL,
          progress_total integer DEFAULT 0 NOT NULL,
          started_at timestamp without time zone,
          updated_at timestamp without time zone,
          CONSTRAINT survey_calculations_pkey PRIMARY KEY (survey_id),
          CONSTRAINT fk_survey_calculations_survey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
      );

      ALTER TABLE responses ADD COLUMN computations jsonb NULL;
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE responses DROP COLUMN IF EXISTS computations;

      DROP TABLE IF EXISTS survey_calculations;
    `);
  }
}
