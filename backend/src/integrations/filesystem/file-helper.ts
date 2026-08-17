import { FileDownload, FileInfo } from './file-info';
import { SurveyFolder } from './survey-folder';

/**
 * DI token for the bound `FileHelper` implementation. A TypeScript `interface`
 * is erased at runtime and can't serve as a Nest provider token, so consumers
 * inject this symbol (`@Inject(FILE_HELPER)`) and type the field as `FileHelper`.
 */
export const FILE_HELPER = Symbol('FILE_HELPER');

/**
 * Storage abstraction for survey files. This is the
 * seam that keeps storage swappable: a build binds one implementation to
 * `FILE_HELPER` (this core binds a local/object store; downstream builds may
 * bind S3) WITHOUT any caller changing — services depend only on this contract.
 *
 * Every file lives under the key `{surveyId}/{folder}/{filename}`;
 * implementations must preserve that layout so existing files stay addressable
 * across the migration.
 *
 * Scope note (migration): the ZIP export/import methods, media optimization on
 * upload, and `deleteUnusedResponseFiles` are added with their owning phases
 * (engine / media / responses); this contract covers the core object-store ops.
 */
export interface FileHelper {
  /** Store raw bytes (already-decoded upload, unzip, generated content). */
  uploadBinary(
    surveyId: string,
    folder: SurveyFolder,
    body: Buffer,
    contentType: string,
    filename: string,
  ): Promise<void>;

  /**
   * Store an uploaded file, rejecting an empty one. Returns
   * the stored filename.
   */
  upload(
    surveyId: string,
    folder: SurveyFolder,
    body: Buffer,
    contentType: string,
    filename: string,
  ): Promise<string>;

  /** Store text as `application/json` (design/nav/schema snapshots). */
  uploadText(
    surveyId: string,
    folder: SurveyFolder,
    text: string,
    filename: string,
  ): Promise<void>;

  doesFileExist(
    surveyId: string,
    folder: SurveyFolder,
    filename: string,
  ): Promise<boolean>;

  /** All files under a survey's `resources/` folder. */
  listSurveyResources(surveyId: string): Promise<FileInfo[]>;

  /** Resources filtered to `files` and modified after `dateFrom` (offline sync). */
  surveyResourcesFiles(
    surveyId: string,
    files?: string[],
    dateFrom?: string,
  ): Promise<FileInfo[]>;

  /** All files attached to one response. */
  responseFiles(
    surveyId: string,
    responseId: string,
  ): Promise<FileInfo[]>;

  /** Copy every resource from one survey to another (survey clone). */
  cloneResources(
    sourceSurveyId: string,
    destinationSurveyId: string,
  ): Promise<void>;

  /** Copy a single design file across surveys, renaming it. */
  copyDesign(
    sourceSurveyId: string,
    destinationSurveyId: string,
    sourceFileName: string,
    newFileName: string,
  ): Promise<void>;

  /** Delete every file under a survey (survey deletion). */
  deleteSurveyFiles(surveyId: string): Promise<void>;

  download(
    surveyId: string,
    folder: SurveyFolder,
    filename: string,
  ): Promise<FileDownload>;

  getText(
    surveyId: string,
    folder: SurveyFolder,
    filename: string,
  ): Promise<string>;

  delete(
    surveyId: string,
    folder: SurveyFolder,
    filename: string,
  ): Promise<void>;

  /**
   * Delete response files no longer referenced by the final answer values or a
   * voice-recording event — run on submit.
   */
  deleteUnusedResponseFiles(
    surveyId: string,
    responseId: string,
    values: Record<string, unknown>,
    events: unknown[],
  ): Promise<void>;

  /**
   * Bundle a survey into a ZIP: `resources/<file>` for
   * each resource, `design.json` (the processed design of `designVersion`), and
   * `survey.json` (the given survey-data JSON).
   */
  exportSurvey(
    surveyId: string,
    designVersion: string,
    surveyDataJson: string,
  ): Promise<Buffer>;

  /**
   * Pull the pieces out of an export ZIP: the
   * `survey.json` text, the `design.json` bytes, and every `resources/<file>`.
   * Anything else in the archive is ignored. Node holds the contents in memory
   * (no temp files), so there is nothing to clean up.
   */
  extractImportZip(zip: Buffer): Promise<ImportedSurveyZip>;

  /**
   * Store an extracted survey's files: the
   * design as version `1`, and each resource under `resources/` (optimized like
   * any resource upload).
   */
  uploadImportedSurvey(
    surveyId: string,
    designFile: Buffer,
    resources: ImportedResource[],
  ): Promise<void>;
}

/** One `resources/<name>` file pulled out of an import ZIP. */
export interface ImportedResource {
  name: string;
  body: Buffer;
}

/**
 * The pieces of an export ZIP. `surveyJson` /
 * `designFile` are null when the archive is missing that entry — the importer
 * rejects both cases.
 */
export interface ImportedSurveyZip {
  surveyJson: string | null;
  designFile: Buffer | null;
  resources: ImportedResource[];
}
