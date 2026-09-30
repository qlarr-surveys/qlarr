import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `responses.quota_codes`: the group quotas a response counts towards, kept by a
 * trigger from its `values` (every `Survey.quota_<code>` that is true, none when
 * the response is disqualified). Quota counting reads this small column instead
 * of every response's answers JSON (see QuotaService.counts).
 *
 * Adding a column with a constant default doesn't rewrite the table. The
 * backfill only touches responses that hold quota values.
 */
export class ResponseQuotaCodes0000000000002 implements MigrationInterface {
  name = 'ResponseQuotaCodes0000000000002';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE responses ADD COLUMN quota_codes text[] NOT NULL DEFAULT '{}';

      CREATE FUNCTION set_response_quota_codes() RETURNS trigger
          LANGUAGE plpgsql
          AS $$
      BEGIN
          IF NEW."values" IS NULL
             OR COALESCE(NEW."values" ->> 'Survey.disqualified', 'false') = 'true' THEN
              NEW.quota_codes := '{}';
          ELSE
              NEW.quota_codes := ARRAY(
                  SELECT substr(kv.key, 14)
                    FROM jsonb_each_text(NEW."values") AS kv(key, value)
                   WHERE left(kv.key, 13) = 'Survey.quota_' AND kv.value = 'true'
                   ORDER BY 1
              );
          END IF;
          RETURN NEW;
      END;
      $$;

      CREATE TRIGGER trigger_set_response_quota_codes
          BEFORE INSERT OR UPDATE OF "values" ON responses
          FOR EACH ROW EXECUTE FUNCTION set_response_quota_codes();

      UPDATE responses SET "values" = "values"
       WHERE "values" IS NOT NULL
         AND EXISTS (
             SELECT 1 FROM jsonb_object_keys("values") AS k
              WHERE left(k, 13) = 'Survey.quota_'
         );
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DROP TRIGGER IF EXISTS trigger_set_response_quota_codes ON responses;
      DROP FUNCTION IF EXISTS set_response_quota_codes();
      ALTER TABLE responses DROP COLUMN IF EXISTS quota_codes;
    `);
  }
}
