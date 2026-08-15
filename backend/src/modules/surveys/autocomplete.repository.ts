import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { DbContext } from '../../database/db-context';

/**
 * Data-access for the `auto_complete` table (the design-time editor's
 * uploaded value lists), plus the small survey-existence check the autocomplete
 * flows need. Single home for every `auto_complete` query: the design editor
 * (AutoCompleteService), resource upload (SurveyResourceService), and the
 * survey-lifecycle copies (clone/import/export). Resolves the repository per
 * call from the request-scoped manager.
 */
@Injectable()
export class AutoCompleteRepository {
  constructor(private readonly db: DbContext) {}

  async surveyExists(surveyId: string): Promise<boolean> {
    const rows = await this.db.manager.query(
      `SELECT 1 FROM surveys WHERE id = $1`,
      [surveyId],
    );
    return rows.length > 0;
  }

  /** The stored value list for a component (empty when none uploaded). */
  async getData(surveyId: string, componentId: string): Promise<string[]> {
    const [row]: Array<{ data: string[] }> = await this.db.manager.query(
      `SELECT data FROM auto_complete WHERE survey_id = $1 AND component_id = $2`,
      [surveyId, componentId],
    );
    return row ? row.data : [];
  }

  /**
   * Distinct values in a survey's autocomplete file matching the term. A survey
   * that can't be resolved is 404'd upstream before reaching here, so this
   * always runs against an existing survey.
   */
  async search(
    surveyId: string,
    filename: string,
    searchTerm: string,
    limit: number,
  ): Promise<string[]> {
    const rows: Array<{ match_value: string }> = await this.db.manager.query(
      `SELECT DISTINCT elem.value #>> '{}' AS match_value
         FROM auto_complete ac
         CROSS JOIN LATERAL jsonb_array_elements(ac.data) AS elem(value)
        WHERE ac.survey_id = $1
          AND ac.filename = $2
          AND elem.value #>> '{}' ILIKE '%' || $3 || '%'
        ORDER BY match_value
        LIMIT $4`,
      [surveyId, filename, searchTerm, limit],
    );
    return rows.map((r) => r.match_value);
  }

  /** Copy every autocomplete row from one survey to another (clone). */
  async copyToSurvey(sourceSurveyId: string, destSurveyId: string): Promise<void> {
    await this.db.manager.query(
      `INSERT INTO auto_complete (survey_id, component_id, data, filename)
       SELECT $2, component_id, data, filename FROM auto_complete WHERE survey_id = $1`,
      [sourceSurveyId, destSurveyId],
    );
  }

  /** The autocomplete resources (code + filename) attached to a survey (export). */
  listResources(
    surveyId: string,
  ): Promise<Array<{ code: string; filename: string }>> {
    return this.db.manager.query(
      `SELECT component_id AS code, filename FROM auto_complete WHERE survey_id = $1`,
      [surveyId],
    );
  }

  /** The stored filename for a component's autocomplete, or null if none. */
  async findFilename(
    surveyId: string,
    componentId: string,
  ): Promise<string | null> {
    const [row]: Array<{ filename: string }> = await this.db.manager.query(
      `SELECT filename FROM auto_complete WHERE survey_id = $1 AND component_id = $2`,
      [surveyId, componentId],
    );
    return row ? row.filename : null;
  }

  async deleteRow(
    surveyId: string,
    componentId: string,
    manager: EntityManager = this.db.manager,
  ): Promise<void> {
    await manager.query(
      `DELETE FROM auto_complete WHERE survey_id = $1 AND component_id = $2`,
      [surveyId, componentId],
    );
  }

  async insert(
    surveyId: string,
    componentId: string,
    data: string,
    filename: string,
    manager: EntityManager = this.db.manager,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO auto_complete (survey_id, component_id, data, filename)
       VALUES ($1, $2, $3::jsonb, $4)`,
      [surveyId, componentId, data, filename],
    );
  }
}
