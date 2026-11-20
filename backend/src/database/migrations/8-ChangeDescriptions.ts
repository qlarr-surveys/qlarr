import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A save can belong to a described change: several saves that make one
 * change, sent with the same id and description. The draft records its latest
 * change (`last_change_id`, `last_change`), and a snapshot keeps the
 * description of the latest change in the design it captured.
 */
export class ChangeDescriptions0000000000008 implements MigrationInterface {
  name = 'ChangeDescriptions0000000000008';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE versions
          ADD COLUMN last_change_id text,
          ADD COLUMN last_change text;

      ALTER TABLE design_snapshots ADD COLUMN description text;
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE versions
          DROP COLUMN IF EXISTS last_change_id,
          DROP COLUMN IF EXISTS last_change;

      ALTER TABLE design_snapshots DROP COLUMN IF EXISTS description;
    `);
  }
}
