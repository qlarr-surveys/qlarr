import { NavigationIndexJson } from '../../engine/engine.types';

/** Response filter status. Unknown → ALL. */
export type ResponseStatus = 'ALL' | 'COMPLETE' | 'INCOMPLETE' | 'PREVIEW';

export function responseStatusFrom(input?: string): ResponseStatus {
  switch ((input ?? '').toUpperCase()) {
    case 'COMPLETE':
      return 'COMPLETE';
    case 'INCOMPLETE':
      return 'INCOMPLETE';
    case 'PREVIEW':
      return 'PREVIEW';
    default:
      return 'ALL';
  }
}

/** One row in the response list. Dates are "yyyy-MM-dd HH:mm:ss" wall clocks;
 *  `values` is intentionally omitted. */
export interface ResponseSummary {
  id: string;
  index: number;
  surveyId: string;
  surveyor: string | null;
  startDate: string;
  submitDate: string | null;
  lang: string;
  preview: boolean;
  disqualified: boolean | null;
  firstName: string | null;
  lastName: string | null;
}

/** ≈ ResponsesSummaryDto — a page of response summaries. */
export interface ResponsesSummaryDto {
  totalCount: number;
  totalPages: number;
  pageNumber: number;
  responses: ResponseSummary[];
  canExportFiles: boolean;
}

/**
 * An uploaded response file. This is also the exact shape stored under
 * `values["<questionId>.value"]`, so the JSON keys
 * (`stored_filename`) must match — that's what download/bulk-export read back.
 */
export interface ResponseUploadFile {
  filename: string;
  stored_filename: string;
  size: number;
  type: string;
}

/**
 * An offline-captured response being synced back. `navigationIndex` must be at
 * `End` for the sync to be accepted. NOTE: the Android client is JVM/Jackson, so
 * `startDate` /
 * `submitDate` arrive on the wire as `LocalDateTime` arrays
 * (`[year, month, day, hour, minute, second, nano]`), not strings — the
 * `timestampTextTransformer` normalizes them to "yyyy-MM-dd HH:mm:ss" on write.
 */
export interface UploadResponseRequestData {
  versionId: number;
  lang: string;
  values?: Record<string, unknown>;
  startDate: string;
  submitDate: string;
  userId: string;
  navigationIndex: NavigationIndexJson;
  events?: unknown[];
}

/** Post-sync counts. */
export interface ResponseCountDto {
  completeResponseCount: number;
  userResponsesCount: number;
}

/**
 * One resolved answer in a single-response read. `key` is the human-readable
 * `(<index>) <label>` heading; `value` is the masked
 * value with the raw value in brackets when a mask exists, else the raw value.
 */
export interface ResponseValue {
  key: string;
  code: string;
  value: unknown;
}

/** A single response with resolved, labelled values. */
export interface ResponseDto {
  id: string;
  index: number | null;
  startDate: string;
  submitDate: string | null;
  lang: string;
  preview: boolean;
  disqualified: boolean;
  values: ResponseValue[];
  surveyorName: string | null;
  surveyorID: string | null;
  version: number;
  events: unknown[];
  ipAddress: string | null;
}

/** One timeline event; `responseValue` is set only for value-timing events. */
export interface ResponseEventDto {
  event: unknown;
  responseValue: ResponseValue | null;
}
