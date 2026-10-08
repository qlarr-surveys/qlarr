import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResponseQuotaCodes0000000000002 implements MigrationInterface {
  name = 'ResponseQuotaCodes0000000000002';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      -- Quotas a response counts towards (none if disqualified), kept in sync from "values" by the trigger below.
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
                  SELECT substring(kv.key FROM '^Survey\\.var_(.+)_met$')
                    FROM jsonb_each_text(NEW."values") AS kv(key, value)
                   WHERE kv.key ~ '^Survey\\.var_.+_met$' AND kv.value = 'true'
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
              WHERE k ~ '^Survey\\.var_.+_met$'
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
