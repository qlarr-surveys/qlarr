import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline schema — the CURRENT end-state (all prior changelogs collapsed into
 * one), not the migration history. Materializes a fresh database. Derived from
 * a pg_dump of the applied changelogs.
 */
// TypeORM orders migrations by parseInt(name.substr(-13)), so the name must end
// in a 13-digit number. This is baseline #1, zero-padded to satisfy that.
export class Baseline0000000000001 implements MigrationInterface {
  name = 'Baseline0000000000001';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE FUNCTION assign_survey_response_index() RETURNS trigger
          LANGUAGE plpgsql
          AS $$
      DECLARE
          seq_name TEXT := 'response_seq_' || NEW.survey_id;
      BEGIN
          PERFORM 1 FROM pg_class WHERE relname = seq_name;
          IF NOT FOUND THEN
              EXECUTE format('CREATE SEQUENCE %I START 1', seq_name);
          END IF;
          EXECUTE format('SELECT nextval(%L)', seq_name) INTO NEW.survey_response_index;
          RETURN NEW;
      END;
      $$;

      CREATE TABLE users (
          id uuid NOT NULL,
          first_name character varying(255) NOT NULL,
          last_name character varying(255) NOT NULL,
          email character varying(255) NOT NULL,
          password character varying(255) NOT NULL,
          deleted boolean NOT NULL,
          roles character varying(255)[] NOT NULL,
          is_confirmed boolean DEFAULT true NOT NULL,
          last_login timestamp without time zone,
          CONSTRAINT users_pkey PRIMARY KEY (id),
          CONSTRAINT uc_users_email UNIQUE (email)
      );

      CREATE TABLE surveys (
          id uuid NOT NULL,
          can_lock_survey boolean NOT NULL,
          creation_date timestamp without time zone,
          last_modified timestamp without time zone,
          start_date timestamp without time zone,
          end_date timestamp without time zone,
          name character varying(255) NOT NULL,
          quota integer NOT NULL,
          status character varying(255),
          usage character varying(255),
          record_gps boolean NOT NULL,
          save_ip boolean NOT NULL,
          save_timings boolean NOT NULL,
          background_audio boolean NOT NULL,
          description text,
          image character varying(255),
          navigation_data text,
          CONSTRAINT surveys_pkey PRIMARY KEY (id),
          CONSTRAINT uc_surveys_name UNIQUE (name)
      );

      CREATE TABLE versions (
          version integer NOT NULL,
          sub_version integer NOT NULL,
          survey_id uuid NOT NULL,
          last_modified timestamp without time zone NOT NULL,
          schema text NOT NULL,
          valid boolean NOT NULL,
          published boolean NOT NULL,
          CONSTRAINT versions_pkey PRIMARY KEY (version, survey_id),
          CONSTRAINT pc_version_survey FOREIGN KEY (survey_id) REFERENCES surveys(id)
      );

      CREATE TABLE responses (
          id uuid NOT NULL,
          version integer NOT NULL,
          survey_id uuid NOT NULL,
          preview boolean NOT NULL,
          surveyor uuid,
          nav_index text NOT NULL,
          start_date timestamp without time zone NOT NULL,
          submit_date timestamp without time zone,
          lang character varying(5) NOT NULL,
          "values" jsonb,
          ip_addr character varying(255),
          events jsonb NOT NULL,
          survey_response_index integer,
          CONSTRAINT responses_pkey PRIMARY KEY (id),
          CONSTRAINT pc_response_survey FOREIGN KEY (survey_id) REFERENCES surveys(id),
          CONSTRAINT pc_surveyor_user FOREIGN KEY (surveyor) REFERENCES users(id),
          CONSTRAINT pc_response_version FOREIGN KEY (survey_id, version) REFERENCES versions(survey_id, version)
      );

      CREATE TABLE refresh_tokens (
          id uuid NOT NULL,
          user_id uuid NOT NULL,
          expiration timestamp without time zone NOT NULL,
          session_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
          CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
          CONSTRAINT pc_refresh_users FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE email_changes (
          user_id uuid NOT NULL,
          new_email character varying(255) NOT NULL,
          pin character varying(6) NOT NULL,
          CONSTRAINT email_changes_pkey PRIMARY KEY (user_id),
          CONSTRAINT pc_email_changes_user FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE auto_complete (
          survey_id uuid NOT NULL,
          component_id character varying(255) NOT NULL,
          data jsonb NOT NULL,
          filename character varying(255) NOT NULL,
          CONSTRAINT auto_complete_pkey PRIMARY KEY (survey_id, filename),
          CONSTRAINT uk_auto_complete_survey_component UNIQUE (survey_id, component_id),
          CONSTRAINT fk_auto_complete_survey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX idx_responses_survey_response_index ON responses USING btree (survey_id, survey_response_index);

      CREATE TRIGGER trigger_assign_survey_response_index BEFORE INSERT ON responses FOR EACH ROW EXECUTE FUNCTION assign_survey_response_index();
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DROP TABLE IF EXISTS auto_complete, email_changes, refresh_tokens, responses, versions, surveys, users CASCADE;
      DROP FUNCTION IF EXISTS assign_survey_response_index() CASCADE;
    `);
  }
}
