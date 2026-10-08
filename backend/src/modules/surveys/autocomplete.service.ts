import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { nowUtcString } from '../../common/datetime';
import {
  FILE_HELPER,
  FileHelper,
} from '../../integrations/filesystem/file-helper';
import { HierarchicalAutoCompleteFileInfo } from '../../integrations/filesystem/file-info';
import { SurveyFolder } from '../../integrations/filesystem/survey-folder';
import { DesignService } from '../design/design.service';
import { additionalLang, defaultSurveyLang } from '../run/run.helpers';
import { AutoCompleteRepository } from './autocomplete.repository';
import {
  HierarchicalAutoCompleteMalformedInputException,
  SurveyIsClosedException,
  SurveyNotFoundException,
} from './survey.exceptions';
import { fromCsv, languagesOf, toCsv } from './hierarchical-autocomplete-csv';

@Injectable()
export class AutoCompleteService {
  constructor(
    private readonly autoComplete: AutoCompleteRepository,
    private readonly designs: DesignService,
    @Inject(FILE_HELPER) private readonly files: FileHelper,
  ) {}

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

  async getHierarchicalCsv(
    surveyId: string,
    componentId: string,
    langs: string[] = [],
    labels: string[] = [],
  ): Promise<string> {
    if (!(await this.autoComplete.surveyExists(surveyId))) {
      throw new SurveyNotFoundException();
    }
    const data = await this.autoComplete.getHierarchicalData(
      surveyId,
      componentId,
    );
    return toCsv(data, langs, labels);
  }

  async uploadHierarchical(
    surveyId: string,
    componentId: string,
    levels: number,
    file: { size: number; buffer: Buffer },
  ): Promise<HierarchicalAutoCompleteFileInfo> {
    if (!file || file.size === 0 || !file.buffer?.length) {
      throw new HierarchicalAutoCompleteMalformedInputException();
    }
    const surveyLangs = await this.openSurveyLangs(surveyId);

    // The file is the full data set — it replaces whatever was stored. Columns
    // for languages the survey doesn't have are silently ignored.
    const { rows, imported } = fromCsv(
      file.buffer.toString('utf8'),
      levels,
      surveyLangs,
    );
    const serialized = JSON.stringify(rows);

    const previousFilename = await this.autoComplete.findFilename(
      surveyId,
      componentId,
    );
    const savedFilename = await this.files.upload(
      surveyId,
      SurveyFolder.Resources,
      Buffer.from(serialized, 'utf8'),
      'application/json',
      randomUUID(),
    );
    await this.autoComplete.replace(surveyId, componentId, serialized, savedFilename);

    // The old file is unreferenced only once the swap has committed. Best-effort.
    if (previousFilename) {
      try {
        await this.files.delete(surveyId, SurveyFolder.Resources, previousFilename);
      } catch {
        // best-effort cleanup
      }
    }

    return {
      name: savedFilename,
      rowCount: rows.length,
      levels,
      languages: languagesOf(rows),
      imported,
      lastModified: nowUtcString(),
    };
  }

  /**
   * The survey's languages (default first) from its saved design, after
   * asserting the survey exists and isn't closed.
   */
  private async openSurveyLangs(surveyId: string): Promise<string[]> {
    const { survey, output } = await this.designs.getProcessedSurvey(
      surveyId,
      false,
    );
    if (survey.status === 'CLOSED') throw new SurveyIsClosedException();
    return [
      defaultSurveyLang(output.survey),
      ...additionalLang(output.survey),
    ].map((l) => l.code);
  }
}
