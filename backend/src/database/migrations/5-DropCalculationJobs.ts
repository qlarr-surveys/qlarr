import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Compute runs as a pg-boss job: the run state moves off `survey_calculations`,
 * which gains `results_epoch`, the fence a Compute's results writes check.
 */
export class DropCalculationJobs0000000000005 implements MigrationInterface {
  name = 'DropCalculationJobs0000000000005';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE survey_calculations
          DROP COLUMN status,
          DROP COLUMN progress_done,
          DROP COLUMN progress_total,
          DROP COLUMN started_at,
          ADD COLUMN results_epoch integer DEFAULT 0 NOT NULL;
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE survey_calculations
          DROP COLUMN results_epoch,
          ADD COLUMN status text DEFAULT 'idle' NOT NULL,
          ADD COLUMN progress_done integer DEFAULT 0 NOT NULL,
          ADD COLUMN progress_total integer DEFAULT 0 NOT NULL,
          ADD COLUMN started_at timestamp without time zone;
    `);
  }
}
