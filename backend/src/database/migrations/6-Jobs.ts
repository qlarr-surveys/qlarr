import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Our side of each pg-boss job: the survey it belongs to (deleted with the
 * survey) and its progress, which pg-boss has nowhere to keep. A row whose job
 * pg-boss deleted is swept.
 */
export class Jobs0000000000006 implements MigrationInterface {
  name = 'Jobs0000000000006';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE jobs (
          id uuid NOT NULL,
          survey_id uuid NOT NULL,
          progress_done integer DEFAULT 0 NOT NULL,
          progress_total integer DEFAULT 0 NOT NULL,
          CONSTRAINT jobs_pkey PRIMARY KEY (id),
          CONSTRAINT fk_jobs_survey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_jobs_survey ON jobs USING btree (survey_id);
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS jobs`);
  }
}
