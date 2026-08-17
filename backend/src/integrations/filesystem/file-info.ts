import { Readable } from 'node:stream';

/** Metadata for one stored file. */
export interface FileInfo {
  name: string;
  size: number;
  /** "yyyy-MM-dd HH:mm:ss" UTC wall clock (matches the API date format). */
  lastModified: string;
}

/** Metadata for an uploaded autocomplete resource. */
export interface AutoCompleteFileInfo {
  name: string;
  rowCount: number;
  size: number;
  /** "yyyy-MM-dd HH:mm:ss" UTC wall clock. */
  lastModified: string;
}

/** A file's bytes plus the headers a download response needs (≈ `FileDownload`). */
export interface FileDownload {
  contentType: string;
  eTag?: string;
  contentLength?: number;
  body: Readable;
}
