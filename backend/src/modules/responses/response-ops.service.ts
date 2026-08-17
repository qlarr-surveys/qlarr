import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { lookup } from 'mime-types';
import { EngineService } from '../../engine/engine.service';
import { FileDownload } from '../../integrations/filesystem/file-info';
import { FILE_HELPER, FileHelper } from '../../integrations/filesystem/file-helper';
import { SurveyFolder } from '../../integrations/filesystem/survey-folder';
import { DesignService } from '../design/design.service';
import { ResponseRepository } from './response.repository';
import { SurveyDesignWithErrorException } from '../run/run.exceptions';
import {
  SurveyIsNotActiveException,
  SurveyNotFoundException,
} from '../surveys/survey.exceptions';
import {
  ResponseCountDto,
  ResponseUploadFile,
  UploadResponseRequestData,
} from './response.dto';
import {
  FileTooBigException,
  IncompleteResponse,
  InvalidQuestionId,
  InvalidResponse,
  ResponseAlreadySyncedException,
  ResponseNotFoundException,
} from './response.exceptions';

interface UploadedFile {
  originalname: string;
  mimetype?: string;
  size: number;
  buffer: Buffer;
}

const MB = 1024 * 1024;
const OCTET_STREAM = 'application/octet-stream';

/**
 * Resolve the content type used for the size limit, the stored object, and the
 * descriptor. Multer defaults a file part with no content type to
 * `application/octet-stream`, so we treat that generic value as "absent" and
 * probe the filename extension. Otherwise e.g. an `interview.mp4` uploaded by an
 * offline client with no content type would get the 10MB image limit instead of
 * the 30MB video limit.
 */
export function resolveMimeType(file: {
  originalname: string;
  mimetype?: string;
}): string {
  if (file.mimetype && file.mimetype !== OCTET_STREAM) return file.mimetype;
  return lookup(file.originalname) || OCTET_STREAM;
}

/**
 * Response file operations + offline response sync. Files live under
 * `responses/<responseId>/`; the stored-file descriptor is mirrored into the
 * response's `values` so it
 * round-trips on download/export. `uploadOfflineSurveyResponse` re-runs the
 * engine over the synced answers to confirm validity before persisting.
 */
@Injectable()
export class ResponseOpsService {
  constructor(
    private readonly responses: ResponseRepository,
    @Inject(FILE_HELPER) private readonly files: FileHelper,
    private readonly design: DesignService,
    private readonly engine: EngineService,
  ) {}

  /**
   * Sync a completed offline response: the survey must be active + valid, the
   * response id unseen, and the client's
   * navigation index at `End`. The engine re-navigates the answers (Resume,
   * OFFLINE) and the response is stored only if it comes back valid. Returns the
   * updated complete/user response counts.
   */
  async uploadOfflineSurveyResponse(
    surveyId: string,
    responseId: string,
    data: UploadResponseRequestData,
    currentUserId: string,
  ): Promise<ResponseCountDto> {
    const processed = await this.design.getProcessedSurveyByVersion(surveyId, data.versionId);
    if (processed.survey.status !== 'ACTIVE') {
      throw new SurveyIsNotActiveException();
    }
    if (!processed.version.valid) {
      throw new SurveyDesignWithErrorException();
    }
    if (await this.responses.exists(responseId)) {
      throw new ResponseAlreadySyncedException();
    }
    if (data.navigationIndex.name !== 'end') {
      throw new IncompleteResponse();
    }

    const navigation = await this.engine.navigate({
      values: JSON.stringify(data.values ?? {}),
      processedSurvey: JSON.stringify(processed.output),
      navigationDirection: { name: 'RESUME' },
      navigationIndex: data.navigationIndex,
      lang: data.lang,
      skipInvalid: false,
      navigationMode: processed.survey.navigationData.navigationMode,
      surveyMode: 'OFFLINE',
    });

    const qlarrVariables = navigation.state?.qlarrVariables as
      | { Survey?: { validity?: unknown } }
      | undefined;
    if (qlarrVariables?.Survey?.validity !== true) {
      throw new InvalidResponse();
    }

    await this.responses.save({
      id: responseId,
      version: data.versionId,
      surveyId,
      preview: false,
      surveyor: data.userId,
      navigationIndex: data.navigationIndex,
      startDate: data.startDate,
      submitDate: data.submitDate,
      lang: data.lang,
      ipAddress: null,
      events: data.events ?? [],
      values: data.values ?? {},
    });

    await this.files.deleteUnusedResponseFiles(
      surveyId,
      responseId,
      data.values ?? {},
      data.events ?? [],
    );

    return this.responseCount(surveyId, currentUserId);
  }

  /** Complete + this-user response counts for a survey. */
  private async responseCount(
    surveyId: string,
    userId: string,
  ): Promise<ResponseCountDto> {
    const counts = await this.responses.counts(surveyId, userId);
    return {
      completeResponseCount: counts.completeResponseCount,
      userResponsesCount: counts.userResponseCount,
    };
  }

  /** Respondent uploads a file for a question; records it under the response. */
  async uploadResponseFile(
    surveyId: string,
    responseId: string,
    questionId: string,
    isPreview: boolean,
    file: UploadedFile,
  ): Promise<ResponseUploadFile> {
    // The survey must exist regardless of mode (else 404 — and no orphan file
    // written to storage for a nonexistent survey); the ACTIVE + date-window
    // check is skipped only in preview.
    if (isPreview) {
      await this.assertSurveyExists(surveyId);
    } else {
      await this.assertActive(surveyId);
    }
    await this.assertResponseExists(responseId);

    const mimeType = resolveMimeType(file);
    this.checkMaxFileSize(file.size, mimeType);
    const storedFilename = randomUUID();
    await this.files.upload(
      surveyId,
      SurveyFolder.Responses(responseId),
      file.buffer,
      mimeType,
      storedFilename,
    );

    const uploaded: ResponseUploadFile = {
      filename: file.originalname,
      stored_filename: storedFilename,
      size: file.size,
      type: mimeType,
    };
    await this.responses.setFileValue(responseId, questionId, uploaded);
    return uploaded;
  }

  /**
   * Offline sync: upload a file under a client-chosen name. Checks survey
   * status ONLY — not the date window — so attachments collected offline can
   * be synced after the survey's end date, as long as it's still ACTIVE
   * (consistent with the offline body sync). Otherwise the body sync would
   * succeed while its file references dangle.
   */
  async uploadOfflineResponseFile(
    surveyId: string,
    responseId: string,
    filename: string,
    file: UploadedFile,
  ): Promise<ResponseUploadFile> {
    await this.assertStatusActive(surveyId);
    const mimeType = resolveMimeType(file);
    this.checkMaxFileSize(file.size, mimeType);
    await this.files.upload(
      surveyId,
      SurveyFolder.Responses(responseId),
      file.buffer,
      mimeType,
      filename,
    );
    return { filename, stored_filename: filename, size: file.size, type: mimeType };
  }

  isOfflineFileAlreadyUploaded(
    surveyId: string,
    responseId: string,
    filename: string,
  ): Promise<boolean> {
    return this.files.doesFileExist(
      surveyId,
      SurveyFolder.Responses(responseId),
      filename,
    );
  }

  /** Download a response file by its stored (UUID) filename. */
  downloadFile(
    surveyId: string,
    responseId: string,
    filename: string,
  ): Promise<FileDownload> {
    return this.files.download(
      surveyId,
      SurveyFolder.Responses(responseId),
      filename,
    );
  }

  /**
   * Download the file a question holds, resolving the stored filename from the
   * response's `values`. Returns the download + a friendly display name.
   */
  async downloadFileNew(
    surveyId: string,
    responseId: string,
    questionId: string,
  ): Promise<{ download: FileDownload; displayName: string }> {
    const row = await this.responses.findFileValue(responseId, questionId);
    if (!row) throw new ResponseNotFoundException();
    const value = row.value;
    if (!value?.filename || !value.stored_filename) {
      throw new InvalidQuestionId();
    }
    const download = await this.files.download(
      surveyId,
      SurveyFolder.Responses(responseId),
      value.stored_filename,
    );
    return {
      download,
      displayName: `${row.index}-${questionId}-${value.filename}`,
    };
  }

  private checkMaxFileSize(size: number, mimeType: string): void {
    const maxSize = mimeType.startsWith('video/') ? 30 * MB : 10 * MB;
    if (size > maxSize) {
      throw new FileTooBigException(size, maxSize, mimeType);
    }
  }

  private async assertResponseExists(responseId: string): Promise<void> {
    if (!(await this.responses.exists(responseId))) {
      throw new ResponseNotFoundException();
    }
  }

  /** Survey exists (else 404) and is currently active (status ACTIVE + in window). */
  private async assertActive(surveyId: string): Promise<void> {
    const active = await this.responses.surveyActive(surveyId);
    if (active === null) throw new SurveyNotFoundException();
    if (!active) throw new SurveyIsNotActiveException();
  }

  /** Survey exists (else 404) and has ACTIVE status, ignoring the date window. */
  private async assertStatusActive(surveyId: string): Promise<void> {
    const active = await this.responses.surveyStatusActive(surveyId);
    if (active === null) throw new SurveyNotFoundException();
    if (!active) throw new SurveyIsNotActiveException();
  }

  /** Survey exists (else 404), without any status/date-window check. */
  private async assertSurveyExists(surveyId: string): Promise<void> {
    if (!(await this.responses.surveyExists(surveyId))) {
      throw new SurveyNotFoundException();
    }
  }
}
