import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { nowUtcString } from '../../common/datetime';
import { generateRandomIdWithExtension } from '../../common/random-resource-id';
import {
  AutoCompleteFileInfo,
  FileDownload,
  FileInfo,
} from '../../integrations/filesystem/file-info';
import { FILE_HELPER, FileHelper } from '../../integrations/filesystem/file-helper';
import { SurveyFolder } from '../../integrations/filesystem/survey-folder';
import { DbContext } from '../../database/db-context';
import { AutoCompleteRepository } from './autocomplete.repository';
import { SurveyEntity } from './survey.entity';
import { SurveyRepository } from './survey.repository';
import {
  AutoCompleteMalformedInputException,
  SurveyIsClosedException,
  SurveyNotFoundException,
} from './survey.exceptions';

/**
 * Survey resource files (resource methods). Upload/delete require the survey
 * to exist and be open; download only that it
 * exists. Storage goes through the injected `FileHelper` (S3 in cloud).
 */
@Injectable()
export class SurveyResourceService {
  constructor(
    @Inject(FILE_HELPER) private readonly helper: FileHelper,
    private readonly surveys: SurveyRepository,
    private readonly autoComplete: AutoCompleteRepository,
    private readonly db: DbContext,
  ) {}

  async uploadResource(
    surveyId: string,
    file: { originalname: string; mimetype?: string; size: number; buffer: Buffer },
  ): Promise<FileInfo> {
    await this.assertOpen(surveyId);
    const filename = generateRandomIdWithExtension(file.originalname);
    const mimeType = file.mimetype || 'application/octet-stream';
    const savedFilename = await this.helper.upload(
      surveyId,
      SurveyFolder.Resources,
      file.buffer,
      mimeType,
      filename,
    );
    return { name: savedFilename, size: file.size, lastModified: nowUtcString() };
  }

  /**
   * Store the autocomplete value list for a component. Validates the file is a
   * non-empty JSON array of strings, uploads it to the survey's resources, and
   * upserts the
   * `auto_complete` row (unique per survey + component — the previous file and
   * row are replaced). Returns the saved file's metadata + row count.
   */
  async uploadAutoCompleteResource(
    surveyId: string,
    componentId: string,
    file: { originalname: string; mimetype?: string; size: number; buffer: Buffer },
  ): Promise<AutoCompleteFileInfo> {
    const values = validateAutoCompleteFile(file);
    await this.assertOpen(surveyId);

    const mimeType = file.mimetype || 'application/octet-stream';
    const savedFilename = await this.helper.upload(
      surveyId,
      SurveyFolder.Resources,
      file.buffer,
      mimeType,
      randomUUID(),
    );

    // Replace any existing autocomplete list for this component. Swap the row
    // (delete + insert) inside one transaction so a failed insert can't leave
    // the component with NO row — which would silently return [] and drop the
    // live question's options (a single unit of work).
    const existingFilename = await this.autoComplete.findFilename(surveyId, componentId);
    await this.db.manager.transaction(async (tx) => {
      if (existingFilename) {
        await this.autoComplete.deleteRow(surveyId, componentId, tx);
      }
      await this.autoComplete.insert(
        surveyId,
        componentId,
        JSON.stringify(values),
        savedFilename,
        tx,
      );
    });

    // The old stored file is unreferenced only once the row swap has committed;
    // deleting it before the transaction would strand the surviving old row's
    // file on a rollback. Best-effort.
    if (existingFilename) {
      try {
        await this.helper.delete(surveyId, SurveyFolder.Resources, existingFilename);
      } catch {
        // best-effort cleanup
      }
    }

    return {
      name: savedFilename,
      rowCount: values.length,
      size: file.size,
      lastModified: nowUtcString(),
    };
  }

  async downloadResource(
    surveyId: string,
    fileName: string,
  ): Promise<FileDownload> {
    await this.assertExists(surveyId);
    return this.helper.download(surveyId, SurveyFolder.Resources, fileName);
  }

  async removeResource(surveyId: string, fileName: string): Promise<void> {
    await this.assertOpen(surveyId);
    await this.helper.delete(surveyId, SurveyFolder.Resources, fileName);
  }

  private async assertExists(surveyId: string): Promise<SurveyEntity> {
    const survey = await this.surveys.findById(surveyId);
    if (!survey) throw new SurveyNotFoundException();
    return survey;
  }

  private async assertOpen(surveyId: string): Promise<void> {
    const survey = await this.assertExists(surveyId);
    if (survey.status === 'CLOSED') {
      throw new SurveyIsClosedException();
    }
  }
}

/**
 * Parse + validate an uploaded autocomplete file: it must be a non-empty JSON
 * array of strings. Anything else — empty, unparseable, non-array, or a
 * non-string element —
 * is a malformed input.
 */
function validateAutoCompleteFile(file: { size: number; buffer: Buffer }): string[] {
  if (!file || file.size === 0 || !file.buffer?.length) {
    throw new AutoCompleteMalformedInputException();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(file.buffer.toString('utf8'));
  } catch {
    throw new AutoCompleteMalformedInputException();
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    !parsed.every((el) => typeof el === 'string')
  ) {
    throw new AutoCompleteMalformedInputException();
  }
  return parsed as string[];
}
