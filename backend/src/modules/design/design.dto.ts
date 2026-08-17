import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { DesignerInput, ValidationJsonOutput } from '../../engine/engine.types';
import { FileInfo } from '../../integrations/filesystem/file-info';
import { Status } from '../surveys/survey.enums';

/** ≈ VersionDto — a design version's metadata (status is the survey's, lowercase). */
export interface VersionDto {
  surveyId: string;
  version: number;
  subVersion: number;
  valid: boolean;
  published: boolean;
  lastModified: string | null;
  status: Status;
}

/** ≈ DesignDto — the designer input plus the current version metadata. */
export interface DesignDto {
  designerInput: DesignerInput;
  versionDto: VersionDto;
}

/** ≈ PublishInfo — a published version marker the offline app holds. Also used
 *  as the offlineDesignDiff request body (validated by the global pipe); the
 *  service still checks `lastModified` is a wall-clock string. */
export class PublishInfo {
  @IsNumber() version: number;
  @IsNumber() subVersion: number;
  /** "yyyy-MM-dd HH:mm:ss" wall clock the client last synced. */
  @IsString() @IsNotEmpty() lastModified: string;
}

/**
 * ≈ DesignDiffDto — the offline-sync response: if the client is up to date it's
 * just the `publishInfo`; otherwise the new design + the resource files changed
 * since the client's `lastModified`.
 */
export interface DesignDiffDto {
  files: FileInfo[];
  publishInfo: PublishInfo;
  validationJsonOutput?: ValidationJsonOutput;
}
