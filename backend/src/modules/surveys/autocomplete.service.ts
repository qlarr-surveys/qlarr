import { Injectable } from '@nestjs/common';
import { AutoCompleteRepository } from './autocomplete.repository';
import { SurveyNotFoundException } from './survey.exceptions';

@Injectable()
export class AutoCompleteService {
  constructor(private readonly autoComplete: AutoCompleteRepository) {}

  /**
   * The stored autocomplete values for a component — the design-time editor's
   * view. The survey must exist; a component with no uploaded file yields an
   * empty list.
   */
  async getAutoCompleteValues(
    surveyId: string,
    componentId: string,
  ): Promise<string[]> {
    if (!(await this.autoComplete.surveyExists(surveyId))) {
      throw new SurveyNotFoundException();
    }
    return this.autoComplete.getData(surveyId, componentId);
  }

  /**
   * Searches a survey's autocomplete file (a JSONB array in `auto_complete`)
   * for values matching the term.
   * An unknown survey (no tenant) is 404'd by the tenant interceptor before it
   * reaches here.
   */
  search(
    surveyId: string,
    filename: string,
    searchTerm: string,
    limit: number,
  ): Promise<string[]> {
    return this.autoComplete.search(surveyId, filename, searchTerm, limit);
  }
}
