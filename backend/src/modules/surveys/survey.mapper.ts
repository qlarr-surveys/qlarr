import { SurveyDTO, SimpleSurveyDto, OfflineSurveyDto, VersionDto } from './survey.dto';
import { SurveyEntity } from './survey.entity';
import { Status, statusFromDb, usageFromDb } from './survey.enums';
import { parseNavigationData } from './survey-navigation-data';
import { VersionEntity } from './version.entity';

/** A `SimpleSurveyDto` from hydrated entities (for survey export). */
export function simpleSurveyFromEntity(
  survey: SurveyEntity,
  version: VersionEntity,
  responsesCount: number,
  completeResponseCount: number,
): SimpleSurveyDto {
  const status = statusFromDb(survey.status);
  return {
    id: survey.id,
    creationDate: survey.creationDate,
    lastModified: survey.lastModified,
    startDate: survey.startDate,
    endDate: survey.endDate,
    name: survey.name,
    description: survey.description,
    image: survey.image,
    status,
    usage: usageFromDb(survey.usage),
    surveyQuota: survey.quota,
    responsesCount,
    completeResponseCount,
    latestVersion: {
      surveyId: version.surveyId,
      version: version.version,
      subVersion: version.subVersion,
      valid: version.valid,
      published: version.published,
      lastModified: version.lastModified,
      status,
    },
    navigationData: survey.navigationData,
    saveIp: survey.saveIp,
    saveTimings: survey.saveTimings,
    backgroundAudio: survey.backgroundAudio,
    recordGps: survey.recordGps,
  };
}

/** Full survey metadata from a hydrated entity (transformers already applied:
 * dates are "yyyy-MM-dd HH:mm:ss" strings, navigationData is an object). */
export function surveyToDto(e: SurveyEntity): SurveyDTO {
  return {
    id: e.id,
    creationDate: e.creationDate,
    lastModified: e.lastModified,
    startDate: e.startDate,
    endDate: e.endDate,
    image: e.image,
    description: e.description,
    name: e.name,
    status: statusFromDb(e.status),
    usage: usageFromDb(e.usage),
    quota: e.quota,
    canLockSurvey: e.canLockSurvey,
    surveyNavigationData: e.navigationData,
    saveIp: e.saveIp,
    saveTimings: e.saveTimings,
    backgroundAudio: e.backgroundAudio,
    recordGps: e.recordGps,
  };
}

/**
 * Raw survey/version rows come from `to_jsonb(s)` / `to_jsonb(v)` in the
 * dashboard queries, which bypass entity transformers — so timestamps arrive as
 * ISO-ish strings, enums as uppercase DB names, and navigation_data as a JSON
 * string. These helpers apply the same conversions the transformers would.
 */
interface RawSurvey {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  status: string | null;
  usage: string | null;
  quota: number;
  creation_date: string | null;
  last_modified: string | null;
  start_date: string | null;
  end_date: string | null;
  navigation_data: string | null;
  save_ip: boolean;
  save_timings: boolean;
  background_audio: boolean;
  record_gps: boolean;
}

interface RawVersion {
  survey_id: string;
  version: number;
  sub_version: number;
  valid: boolean;
  published: boolean;
  last_modified: string | null;
}

/** Postgres timestamps in a `to_jsonb` row look like "2024-01-15T10:30:00". */
const wall = (v: string | null): string | null =>
  v == null ? null : v.replace('T', ' ').slice(0, 19);

function versionFromRow(v: RawVersion, surveyStatus: Status): VersionDto {
  return {
    surveyId: v.survey_id,
    version: v.version,
    subVersion: v.sub_version,
    valid: v.valid,
    published: v.published,
    lastModified: wall(v.last_modified),
    status: surveyStatus,
  };
}

export function simpleSurveyFromRow(
  survey: RawSurvey,
  version: RawVersion,
  responseCount: number,
  completeResponseCount: number,
): SimpleSurveyDto {
  const status = statusFromDb(survey.status);
  return {
    id: survey.id,
    creationDate: wall(survey.creation_date),
    lastModified: wall(survey.last_modified),
    startDate: wall(survey.start_date),
    endDate: wall(survey.end_date),
    name: survey.name,
    description: survey.description,
    image: survey.image,
    status,
    usage: usageFromDb(survey.usage),
    surveyQuota: survey.quota,
    responsesCount: responseCount,
    completeResponseCount,
    latestVersion: versionFromRow(version, status),
    navigationData: parseNavigationData(survey.navigation_data),
    saveIp: survey.save_ip,
    saveTimings: survey.save_timings,
    backgroundAudio: survey.background_audio,
    recordGps: survey.record_gps,
  };
}

export function offlineSurveyFromRow(
  survey: RawSurvey,
  version: RawVersion,
  completeResponseCount: number,
  userResponsesCount: number,
): OfflineSurveyDto {
  const status = statusFromDb(survey.status);
  return {
    id: survey.id,
    creationDate: wall(survey.creation_date),
    lastModified: wall(survey.last_modified),
    startDate: wall(survey.start_date),
    endDate: wall(survey.end_date),
    name: survey.name,
    description: survey.description,
    image: survey.image,
    status,
    usage: usageFromDb(survey.usage),
    surveyQuota: survey.quota,
    userResponsesCount,
    completeResponseCount,
    latestVersion: versionFromRow(version, status),
    navigationData: parseNavigationData(survey.navigation_data),
    saveTimings: survey.save_timings,
    backgroundAudio: survey.background_audio,
    recordGps: survey.record_gps,
  };
}

export type { RawSurvey, RawVersion };
