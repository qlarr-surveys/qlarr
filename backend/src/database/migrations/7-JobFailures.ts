import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The responses a job failed on, per subject, kept until a retry succeeds on
 * them or the subject is invalidated (deleted with the survey or the response).
 * The primary key serves every subject read. `progress_failed` is a running
 * job's live count of them.
 */
export class JobFailures0000000000007 implements MigrationInterface {
  name = 'JobFailures0000000000007';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE job_failures (
          kind text NOT NULL,
          survey_id uuid NOT NULL,
          subject_key text NOT NULL,
          response_id uuid NOT NULL,
          error text NOT NULL,
          failed_at timestamp NOT NULL,
          CONSTRAINT job_failures_pkey PRIMARY KEY (kind, survey_id, subject_key, response_id),
          CONSTRAINT fk_job_failures_survey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
          CONSTRAINT fk_job_failures_response FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE
      );

      ALTER TABLE jobs ADD COLUMN progress_failed integer DEFAULT 0 NOT NULL;
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE jobs DROP COLUMN IF EXISTS progress_failed;
      DROP TABLE IF EXISTS job_failures;
    `);
  }
}
