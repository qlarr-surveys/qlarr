import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'node:fs';
import {
  access,
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { lookup as lookupMimeType } from 'mime-types';
import { ZipFile } from 'yazl';
import yauzl from 'yauzl';
import { formatWallClockUtc, wallClockToInstant } from '../../common/datetime';
import { StorageConfig } from '../../config/storage.config';
import { FileHelper, ImportedResource, ImportedSurveyZip } from './file-helper';
import { FileDownload, FileInfo } from './file-info';
import {
  MaliciousArchiveException,
  ResourceNotFoundException,
} from './filesystem.exceptions';
import { MediaOptimizer } from './media-optimizer';
import { SurveyFolder } from './survey-folder';

const METADATA_POSTFIX = '.metadata';

/**
 * Local-disk `FileHelper` — the open-source storage implementation. Stores each
 * file at `{rootFolder}/{surveyId}/{folder}/{filename}` with a sibling
 * `<file>.metadata` sidecar (`Content-Type` / `etag` / `Content-Length`), the
 * same on-disk layout as the Kotlin OSS FileSystemHelper, so a data directory
 * from that backend is served unchanged. Downstream builds bind a different
 * implementation (e.g. S3) to `FILE_HELPER` — no caller changes.
 */
@Injectable()
export class LocalFileHelper implements FileHelper, OnModuleInit {
  private readonly logger = new Logger(LocalFileHelper.name);
  private readonly root: string;

  constructor(config: ConfigService, private readonly media: MediaOptimizer) {
    this.root = config.getOrThrow<StorageConfig>('storage').rootFolder;
  }

  /**
   * Boot-time readiness probe. A mis-owned or read-only storage mount otherwise
   * boots green and only fails on the first file write (a confusing 500 mid-
   * survey). Instead we fail fast here with a clear message, path-agnostic —
   * whatever `FILE_SYSTEM_ROOT_FOLDER` points at (local dir, NFS, EFS) must be
   * writable by this process before we serve traffic.
   */
  async onModuleInit(): Promise<void> {
    const probe = join(this.root, `.qlarr-write-probe-${process.pid}`);
    try {
      await mkdir(this.root, { recursive: true });
      await writeFile(probe, '');
      await rm(probe, { force: true });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Storage root is not writable: ${resolve(this.root)} ` +
          `(FILE_SYSTEM_ROOT_FOLDER). ${reason}`,
      );
    }
    this.logger.log(`Storage root ready: ${resolve(this.root)}`);
  }

  /** `{root}/{surveyId}/{folder}/{filename}` — the file path. Rejects any
   *  segment (surveyId / responseId-in-folder / filename) that escapes the
   *  storage root via `..` traversal. */
  private filePath(
    surveyId: string,
    folder: SurveyFolder,
    filename: string,
  ): string {
    const path = join(this.root, surveyId, folder.path, filename);
    // resolve() collapses `..`; `+ sep` guards a sibling-prefix bypass
    // (root `/data` must not match `/data-evil`).
    if (!resolve(path).startsWith(resolve(this.root) + sep)) {
      throw new BadRequestException('Invalid file path');
    }
    return path;
  }

  /** `{root}/{surveyId}/{folder}` — a folder path. */
  private folderPath(surveyId: string, folder: SurveyFolder): string {
    return join(this.root, surveyId, folder.path);
  }

  async uploadBinary(
    surveyId: string,
    folder: SurveyFolder,
    body: Buffer,
    contentType: string,
    filename: string,
  ): Promise<void> {
    const bytes = await this.optimizeIfResource(folder, body, contentType, filename);
    await this.write(this.filePath(surveyId, folder, filename), bytes, contentType);
  }

  /**
   * Resources get shrunk before storage (images via sharp, video via ffmpeg) —
   * only for the `resources` folder. The stored content type stays the original
   * (the download header is unchanged).
   */
  private async optimizeIfResource(
    folder: SurveyFolder,
    body: Buffer,
    contentType: string,
    filename: string,
  ): Promise<Buffer> {
    if (!folder.isResources) return body;
    if (this.media.isSupportedImage(contentType)) {
      return this.media.optimizeImage(body, contentType);
    }
    if (this.media.isVideo(contentType)) {
      return this.media.optimizeVideo(body, filename);
    }
    return body;
  }

  async upload(
    surveyId: string,
    folder: SurveyFolder,
    body: Buffer,
    contentType: string,
    filename: string,
  ): Promise<string> {
    if (!body.length) throw new ResourceNotFoundException();
    await this.uploadBinary(surveyId, folder, body, contentType, filename);
    return filename;
  }

  async uploadText(
    surveyId: string,
    folder: SurveyFolder,
    text: string,
    filename: string,
  ): Promise<void> {
    await this.write(
      this.filePath(surveyId, folder, filename),
      Buffer.from(text),
      'application/json',
    );
  }

  /** Write bytes + the `.metadata` sidecar (Content-Type / etag / Content-Length). */
  private async write(
    path: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    const st = await stat(path);
    const etag = `${Math.floor(st.mtimeMs)}-${st.size}`;
    await writeFile(
      `${path}${METADATA_POSTFIX}`,
      `Content-Type: ${contentType}\netag: ${etag}\nContent-Length: ${body.length}`,
    );
  }

  async doesFileExist(
    surveyId: string,
    folder: SurveyFolder,
    filename: string,
  ): Promise<boolean> {
    try {
      await access(this.filePath(surveyId, folder, filename));
      return true;
    } catch {
      return false;
    }
  }

  async listSurveyResources(surveyId: string): Promise<FileInfo[]> {
    return this.surveyResourcesFiles(surveyId);
  }

  async surveyResourcesFiles(
    surveyId: string,
    files?: string[],
    dateFrom?: string,
  ): Promise<FileInfo[]> {
    const entries = await this.listFolder(
      this.folderPath(surveyId, SurveyFolder.Resources),
    );
    const fromMs = dateFrom ? wallClockToInstant(dateFrom) : null;
    return entries
      .filter((e) => {
        if (files && !files.includes(e.name)) return false;
        if (fromMs != null && e.mtimeMs <= fromMs) return false;
        return true;
      })
      .map(toFileInfo);
  }

  async responseFiles(
    surveyId: string,
    responseId: string,
  ): Promise<FileInfo[]> {
    const entries = await this.listFolder(
      this.folderPath(surveyId, SurveyFolder.Responses(responseId)),
    );
    return entries.map(toFileInfo);
  }

  /** Files in a folder (excluding `.metadata` sidecars); [] if the dir is absent. */
  private async listFolder(
    dirPath: string,
  ): Promise<Array<{ name: string; size: number; mtimeMs: number }>> {
    let names: string[];
    try {
      names = await readdir(dirPath);
    } catch {
      return [];
    }
    const out: Array<{ name: string; size: number; mtimeMs: number }> = [];
    for (const name of names) {
      if (name.endsWith(METADATA_POSTFIX)) continue;
      const st = await stat(join(dirPath, name));
      if (!st.isFile()) continue;
      out.push({ name, size: st.size, mtimeMs: st.mtimeMs });
    }
    return out;
  }

  async cloneResources(
    sourceSurveyId: string,
    destinationSurveyId: string,
  ): Promise<void> {
    const src = this.folderPath(sourceSurveyId, SurveyFolder.Resources);
    try {
      await access(src);
    } catch {
      return;
    }
    const dest = this.folderPath(destinationSurveyId, SurveyFolder.Resources);
    await cp(src, dest, { recursive: true });
  }

  async copyDesign(
    sourceSurveyId: string,
    destinationSurveyId: string,
    sourceFileName: string,
    newFileName: string,
  ): Promise<void> {
    const from = this.filePath(sourceSurveyId, SurveyFolder.Design, sourceFileName);
    const to = this.filePath(destinationSurveyId, SurveyFolder.Design, newFileName);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    try {
      await copyFile(`${from}${METADATA_POSTFIX}`, `${to}${METADATA_POSTFIX}`);
    } catch {
      // No sidecar (e.g. a file from an older layout) — nothing to copy.
    }
  }

  async deleteSurveyFiles(surveyId: string): Promise<void> {
    await rm(join(this.root, surveyId), { recursive: true, force: true });
  }

  async download(
    surveyId: string,
    folder: SurveyFolder,
    filename: string,
  ): Promise<FileDownload> {
    const path = this.filePath(surveyId, folder, filename);
    const st = await stat(path).catch(() => {
      throw new ResourceNotFoundException();
    });
    const meta = await this.readMetadata(path);
    return {
      contentType: meta['Content-Type'] ?? getMimeType(filename),
      eTag: meta['etag'] ?? `${Math.floor(st.mtimeMs)}-${st.size}`,
      contentLength: meta['Content-Length'] ? Number(meta['Content-Length']) : st.size,
      body: createReadStream(path),
    };
  }

  async getText(
    surveyId: string,
    folder: SurveyFolder,
    filename: string,
  ): Promise<string> {
    try {
      return await readFile(this.filePath(surveyId, folder, filename), 'utf-8');
    } catch {
      throw new ResourceNotFoundException();
    }
  }

  async delete(
    surveyId: string,
    folder: SurveyFolder,
    filename: string,
  ): Promise<void> {
    const path = this.filePath(surveyId, folder, filename);
    await rm(`${path}${METADATA_POSTFIX}`, { force: true });
    await rm(path, { force: true });
  }

  /** Parse a `.metadata` sidecar into a header map; {} if it doesn't exist. */
  private async readMetadata(path: string): Promise<Record<string, string>> {
    let text: string;
    try {
      text = await readFile(`${path}${METADATA_POSTFIX}`, 'utf-8');
    } catch {
      return {};
    }
    const map: Record<string, string> = {};
    for (const line of text.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        map[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }
    return map;
  }

  async deleteUnusedResponseFiles(
    surveyId: string,
    responseId: string,
    values: Record<string, unknown>,
    events: unknown[],
  ): Promise<void> {
    const referenced = new Set<string>();
    for (const value of Object.values(values)) {
      const v = value as { stored_filename?: unknown } | null;
      if (v && typeof v === 'object' && typeof v.stored_filename === 'string') {
        referenced.add(v.stored_filename);
      }
    }
    for (const event of events) {
      const e = event as { name?: string; fileName?: unknown };
      if (e?.name === 'VoiceRecording' && typeof e.fileName === 'string') {
        referenced.add(e.fileName);
      }
    }
    const folder = SurveyFolder.Responses(responseId);
    const saved = await this.responseFiles(surveyId, responseId);
    for (const file of saved) {
      if (!referenced.has(file.name)) {
        await this.delete(surveyId, folder, file.name);
      }
    }
  }

  async exportSurvey(
    surveyId: string,
    designVersion: string,
    surveyDataJson: string,
  ): Promise<Buffer> {
    const zip = new ZipFile();
    for (const file of await this.listSurveyResources(surveyId)) {
      const dl = await this.download(surveyId, SurveyFolder.Resources, file.name);
      zip.addReadStream(dl.body, `resources/${file.name}`);
    }
    if (await this.doesFileExist(surveyId, SurveyFolder.Design, designVersion)) {
      const dl = await this.download(surveyId, SurveyFolder.Design, designVersion);
      zip.addReadStream(dl.body, 'design.json');
    }
    zip.addBuffer(Buffer.from(surveyDataJson), 'survey.json');
    zip.end();
    return streamToBuffer(zip.outputStream as Readable);
  }

  async extractImportZip(zip: Buffer): Promise<ImportedSurveyZip> {
    let surveyJson: string | null = null;
    let designFile: Buffer | null = null;
    const resources: ImportedResource[] = [];
    for (const entry of await readZipEntries(zip)) {
      const fileName = baseName(entry.name);
      if (fileName === 'survey.json') {
        surveyJson = entry.body.toString('utf-8');
      } else if (fileName === 'design.json') {
        designFile = entry.body;
      } else if (parentFolder(entry.name) === 'resources') {
        resources.push({ name: fileName, body: entry.body });
      }
    }
    return { surveyJson, designFile, resources };
  }

  async uploadImportedSurvey(
    surveyId: string,
    designFile: Buffer,
    resources: ImportedResource[],
  ): Promise<void> {
    await Promise.all([
      this.uploadBinary(surveyId, SurveyFolder.Design, designFile, 'application/json', '1'),
      ...resources.map((r) =>
        this.uploadBinary(surveyId, SurveyFolder.Resources, r.body, getMimeType(r.name), r.name),
      ),
    ]);
  }
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Like `streamToBuffer`, but aborts once more than `limit` bytes have arrived.
 * The declared central-directory size (`entry.uncompressedSize`) is attacker
 * controlled and can understate the real inflated size, so this counts the
 * *actual* decompressed bytes — it's what ultimately stops a bomb.
 */
function streamToBufferBounded(stream: Readable, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let seen = 0;
    stream.on('data', (c: Buffer) => {
      seen += c.length;
      if (seen > limit) {
        stream.destroy();
        reject(new MaliciousArchiveException('decompresses beyond the allowed size'));
        return;
      }
      chunks.push(Buffer.from(c));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const baseName = (key: string): string => key.split('/').pop() ?? key;

/** First path segment; null if unqualified. */
const parentFolder = (path: string): string | null => {
  const segments = path.split('/');
  return segments.length >= 2 ? segments[0] : null;
};

/** Guess a content type from a filename (≈ `URLConnection.guessContentTypeFromName`). */
const getMimeType = (filename: string): string =>
  lookupMimeType(filename) || 'application/octet-stream';

const toFileInfo = (e: {
  name: string;
  size: number;
  mtimeMs: number;
}): FileInfo => ({
  name: e.name,
  size: e.size,
  lastModified: formatWallClockUtc(new Date(e.mtimeMs)),
});

const MB = 1024 * 1024;
/**
 * Decompression budget for an imported ZIP. The multipart layer only caps the
 * *compressed* upload (100MB), which a zip bomb inflates far past in heap. yauzl
 * streams entry-by-entry (`lazyEntries`), so we bound three things: the entry
 * count, the size of any single entry, and the total across the archive. Sizes
 * are enforced against the *actual* decompressed bytes (see
 * `streamToBufferBounded`) — the declared header is only used for an early-out.
 */
const MAX_ZIP_ENTRIES = 500;
const MAX_ENTRY_UNCOMPRESSED = 100 * MB;
const MAX_TOTAL_UNCOMPRESSED = 500 * MB;

/** Read every non-directory entry of a ZIP buffer into memory, bounded against
 * zip-bomb inflation. */
function readZipEntries(
  zip: Buffer,
): Promise<Array<{ name: string; body: Buffer }>> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(zip, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err ?? new Error('Invalid ZIP'));
      const entries: Array<{ name: string; body: Buffer }> = [];
      let count = 0;
      let total = 0;
      const fail = (reason: string) => {
        zipfile.close();
        reject(new MaliciousArchiveException(reason));
      };
      zipfile.on('error', reject);
      zipfile.on('end', () => resolve(entries));
      zipfile.on('entry', (entry: yauzl.Entry) => {
        // Directory entries end in '/' (yauzl convention) — skip them.
        if (/\/$/.test(entry.fileName)) return zipfile.readEntry();
        if (++count > MAX_ZIP_ENTRIES) {
          return fail(`too many entries (limit ${MAX_ZIP_ENTRIES})`);
        }
        // Early-out on the declared size before reading a byte; the streamed
        // counter below re-checks the real size (the header can lie).
        if (entry.uncompressedSize > MAX_ENTRY_UNCOMPRESSED) {
          return fail(`entry "${baseName(entry.fileName)}" exceeds the per-file size limit`);
        }
        // Cap this entry by whichever budget is tighter: its own limit or what
        // remains of the whole-archive allowance.
        const cap = Math.min(MAX_ENTRY_UNCOMPRESSED, MAX_TOTAL_UNCOMPRESSED - total);
        zipfile.openReadStream(entry, (streamErr, stream) => {
          if (streamErr || !stream) return reject(streamErr ?? new Error('ZIP read failed'));
          streamToBufferBounded(stream, cap)
            .then((body) => {
              total += body.length;
              entries.push({ name: entry.fileName, body });
              zipfile.readEntry();
            })
            .catch(reject);
        });
      });
      zipfile.readEntry();
    });
  });
}
