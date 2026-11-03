import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refresh-token rotation: each session keeps one row whose token is swapped in
 * place on every refresh. `previous_id` holds the token it replaced (for the
 * grace window and reuse detection) and `last_used_at` drives the idle timeout.
 * Existing rows are dropped — every user logs in once.
 */
export class RefreshRotation0000000000003 implements MigrationInterface {
  name = 'RefreshRotation0000000000003';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      DELETE FROM refresh_tokens;

      ALTER TABLE refresh_tokens
          ADD COLUMN previous_id uuid NULL,
          ADD COLUMN last_used_at timestamp without time zone NOT NULL;

      CREATE INDEX refresh_tokens_previous_id_idx ON refresh_tokens (previous_id);
      CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DROP INDEX IF EXISTS refresh_tokens_user_id_idx;
      DROP INDEX IF EXISTS refresh_tokens_previous_id_idx;

      ALTER TABLE refresh_tokens
          DROP COLUMN IF EXISTS last_used_at,
          DROP COLUMN IF EXISTS previous_id;
    `);
  }
}
