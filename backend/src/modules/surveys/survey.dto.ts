import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { SurveyNavigationData } from './survey-navigation-data';
import { NavigationMode, Status, Usage } from './survey.enums';

/** ≈ VersionDto. Dates are pre-formatted "yyyy-MM-dd HH:mm:ss" strings. */
export interface VersionDto {
  surveyId: string;
  version: number;
  subVersion: number;
  valid: boolean;
  published: boolean;
  lastModified: string | null;
  status: Status;
}

/** ≈ SurveyCreateRequest. `usage` is the lowercase API form; defaults to `mixed`. */
export class SurveyCreateRequest {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsIn(['web', 'offline', 'mixed']) usage?: Usage;
}

/** ≈ SurveyDTO (full survey metadata). */
export interface SurveyDTO {
  id: string;
  creationDate: string | null;
  lastModified: string | null;
  startDate: string | null;
  endDate: string | null;
  image: string | null;
  description: string | null;
  name: string;
  status: Status;
  usage: Usage;
  quota: number;
  canLockSurvey: boolean;
  surveyNavigationData: SurveyNavigationData;
  saveIp: boolean;
  saveTimings: boolean;
  backgroundAudio: boolean;
  recordGps: boolean;
}

/** ≈ SimpleSurveyDto (dashboard list row, with response counts + version). */
export interface SimpleSurveyDto {
  id: string;
  creationDate: string | null;
  lastModified: string | null;
  startDate: string | null;
  endDate: string | null;
  name: string;
  description: string | null;
  image: string | null;
  status: Status;
  usage: Usage;
  surveyQuota: number;
  responsesCount: number;
  completeResponseCount: number;
  latestVersion: VersionDto;
  navigationData: SurveyNavigationData;
  saveIp: boolean;
  saveTimings: boolean;
  backgroundAudio: boolean;
  recordGps: boolean;
}

/** ≈ ExportedAutoCompleteResource — a survey's autocomplete file, in the export. */
export interface ExportedAutoCompleteResource {
  code: string;
  filename: string;
}

/** ≈ ExportedSimpleSurvey — the `survey.json` payload inside a survey export ZIP. */
export interface ExportedSimpleSurvey {
  survey: SimpleSurveyDto;
  autoCompleteResources: ExportedAutoCompleteResource[];
}

/** ≈ OfflineSurveyDto. */
export interface OfflineSurveyDto {
  id: string;
  creationDate: string | null;
  lastModified: string | null;
  startDate: string | null;
  endDate: string | null;
  name: string;
  description: string | null;
  image: string | null;
  status: Status;
  usage: Usage;
  surveyQuota: number;
  userResponsesCount: number;
  completeResponseCount: number;
  latestVersion: VersionDto;
  navigationData: SurveyNavigationData;
  saveTimings: boolean;
  backgroundAudio: boolean;
  recordGps: boolean;
}

/** ≈ SurveysDto (paginated list envelope). */
export interface SurveysDto {
  totalCount: number;
  totalPages: number;
  pageNumber: number;
  surveys: SimpleSurveyDto[];
}

/** ≈ EditSurveyRequest. All fields optional; absent = keep current value.
 * `additionalLanguages` is accepted for wire-compat but only acted on by the
 * (engine-backed) design path, which isn't ported yet. */
export class EditSurveyRequest {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() startDate?: string | null;
  @IsOptional() @IsString() endDate?: string | null;
  // Contents are engine/design territory — validate only that it's an array.
  @IsOptional() @IsArray() additionalLanguages?: unknown[];
  @IsOptional() @IsIn(['web', 'offline', 'mixed']) usage?: Usage;
  @IsOptional() @IsNumber() quota?: number;
  @IsOptional() @IsBoolean() backgroundAudio?: boolean;
  @IsOptional() @IsBoolean() recordGps?: boolean;
  @IsOptional() @IsBoolean() canLockSurvey?: boolean;
  @IsOptional() @IsBoolean() saveIp?: boolean;
  @IsOptional() @IsBoolean() saveTimings?: boolean;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() image?: string;
  // Mapper defaults unknown values gracefully (→ GROUP_BY_GROUP), so type-only.
  @IsOptional() @IsString() navigationMode?: NavigationMode;
  @IsOptional() @IsBoolean() allowPrevious?: boolean;
  @IsOptional() @IsNumber() resumeExpiryMillis?: number;
  @IsOptional() @IsBoolean() skipInvalid?: boolean;
  @IsOptional() @IsBoolean() allowIncomplete?: boolean;
  @IsOptional() @IsBoolean() allowJump?: boolean;
}

/** ≈ SurveySort. Default (and unknown) → LAST_MODIFIED_DESC. */
export type SurveySort = 'RESPONSES_DESC' | 'LAST_MODIFIED_DESC';
export function parseSurveySort(input?: string | null): SurveySort {
  return input === 'responses_desc' ? 'RESPONSES_DESC' : 'LAST_MODIFIED_DESC';
}

/**
 * ≈ SurveyFilter. Maps a `status` query param to (status, flag) pairs used by
 * the dashboard query. Note SCHEDULED/EXPIRED/ACTIVE all pin status = ACTIVE
 * and differ only by the date-window flag.
 */
export interface SurveyFilter {
  status: Status | null;
  active: boolean;
  scheduled: boolean;
  expired: boolean;
}
export function parseSurveyFilter(input?: string | null): SurveyFilter {
  switch (input) {
    case 'draft':
      return { status: 'draft', active: false, scheduled: false, expired: false };
    case 'active':
      return { status: 'active', active: true, scheduled: false, expired: false };
    case 'scheduled':
      return { status: 'active', active: false, scheduled: true, expired: false };
    case 'expired':
      return { status: 'active', active: false, scheduled: false, expired: true };
    case 'closed':
      return { status: 'closed', active: false, scheduled: false, expired: false };
    default: // "all" / unknown
      return { status: null, active: false, scheduled: false, expired: false };
  }
}
