import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { nowUtcString } from '../../common/datetime';
import { EngineService } from '../../engine/engine.service';
import { FILE_HELPER, FileHelper } from '../../integrations/filesystem/file-helper';
import { SurveyFolder } from '../../integrations/filesystem/survey-folder';
import { DesignService } from '../design/design.service';
import { VersionRepository } from '../design/version.repository';
import { AutoCompleteRepository } from './autocomplete.repository';
import {
  defaultNavigationData,
} from './survey-navigation-data';
import {
  EditSurveyRequest,
  ExportedAutoCompleteResource,
  ExportedSimpleSurvey,
  SimpleSurveyDto,
  SurveyCreateRequest,
  SurveyDTO,
} from './survey.dto';
import { SurveyEntity } from './survey.entity';
import { SurveyRepository } from './survey.repository';
import { usageToDb } from './survey.enums';
import {
  DesignNotAvailableException,
  InvalidSurveyDates,
  InvalidSurveyName,
  SurveyDefNotAvailableException,
  SurveyIsActiveException,
  SurveyIsClosedException,
  SurveyIsNotActiveException,
  SurveyNotFoundException,
} from './survey.exceptions';
import { simpleSurveyFromEntity, surveyToDto } from './survey.mapper';
import { VersionEntity } from './version.entity';

/** trim().length in 1..50. */
const isValidName = (name: string): boolean => {
  const len = name.trim().length;
  return len >= 1 && len <= 50;
};

@Injectable()
export class SurveysService {
  constructor(
    private readonly surveys: SurveyRepository,
    private readonly versions: VersionRepository,
    private readonly autoComplete: AutoCompleteRepository,
    private readonly engine: EngineService,
    private readonly design: DesignService,
    @Inject(FILE_HELPER) private readonly files: FileHelper,
  ) {}

  private async findEntity(id: string): Promise<SurveyEntity> {
    const survey = await this.surveys.findById(id);
    if (!survey) {
      throw new SurveyNotFoundException();
    }
    return survey;
  }

  async getSurveyById(id: string): Promise<SurveyDTO> {
    return surveyToDto(await this.findEntity(id));
  }

  /**
   * Create a new survey with a starter design: save the survey (name made
   * unique) + version 1, seed the blank design through the
   * engine, and register it in the master `global_survey` index.
   */
  async create(req: SurveyCreateRequest): Promise<SurveyDTO> {
    if (!isValidName(req.name)) throw new InvalidSurveyName();
    const entity = this.surveys.create(
      mapCreateRequestToEntity(req, await this.uniqueSurveyName(req.name.trim())),
    );
    await this.surveys.save(entity);
    // The survey/version rows commit before the design is seeded to storage,
    // which isn't part of the DB transaction. So on any mid-failure roll the
    // whole survey back the same way importSurvey does, rather than leaving a
    // half-built survey that shows on the dashboard but 500s on open / 404s on
    // run and has consumed the unique name.
    try {
      await this.versions.save({
        version: 1,
        subVersion: 1,
        surveyId: entity.id,
        valid: false,
        published: false,
        schema: [],
        lastModified: nowUtcString(),
      });
      await this.design.setDesign(
        entity.id,
        JSON.parse(this.engine.newSurvey(req.name)) as Record<string, unknown>,
        1,
        true,
      );
    } catch (err) {
      await this.surveys.deleteCascade(entity.id).catch(() => undefined);
      await this.files.deleteSurveyFiles(entity.id).catch(() => undefined);
      throw err;
    }
    return surveyToDto(entity);
  }

  /** Clone a survey: copy the row, resources, latest design, and autocomplete. */
  async clone(surveyId: string): Promise<SurveyDTO> {
    const survey = await this.findEntity(surveyId);
    const cloned = this.surveys.create({
      ...survey,
      id: randomUUID(),
      name: await this.uniqueSurveyName(survey.name),
      status: 'DRAFT',
      creationDate: nowUtcString(),
      lastModified: nowUtcString(),
    });
    await this.surveys.save(cloned);
    // The resource/design copies aren't part of the DB transaction, so unwind
    // the whole clone on any mid-failure (as create / importSurvey do) rather
    // than orphaning a half-cloned survey that holds the unique name and either
    // hides from or breaks the dashboard.
    try {
      await this.files.cloneResources(surveyId, cloned.id);
      await this.copyDesign(surveyId, cloned.id);
      await this.autoComplete.copyToSurvey(surveyId, cloned.id);
    } catch (err) {
      await this.surveys.deleteCascade(cloned.id).catch(() => undefined);
      await this.files.deleteSurveyFiles(cloned.id).catch(() => undefined);
      throw err;
    }
    return surveyToDto(cloned);
  }

  /** Bundle a survey (metadata + design + resources) into a ZIP. */
  async exportSurvey(surveyId: string): Promise<Buffer> {
    const latest = await this.versions.findLatest(surveyId);
    if (!latest) throw new SurveyNotFoundException();
    const surveyDataJson = await this.getSurveyDataJson(surveyId, latest);
    return this.files.exportSurvey(surveyId, String(latest.version), surveyDataJson);
  }

  /** The `survey.json` payload: normalized metadata (version reset to 1) + autocomplete. */
  private async getSurveyDataJson(
    surveyId: string,
    latest: VersionEntity,
  ): Promise<string> {
    const survey = await this.surveys.findById(surveyId);
    if (!survey) throw new SurveyNotFoundException();
    const normalized: VersionEntity = {
      ...latest,
      version: 1,
      subVersion: 1,
      published: false,
    };
    const autoCompleteResources =
      await this.autoComplete.listResources(surveyId);
    return JSON.stringify({
      survey: simpleSurveyFromEntity(survey, normalized, 0, 0),
      autoCompleteResources,
    });
  }

  /**
   * Restore a survey from an export ZIP: pull out the pieces, require both
   * `survey.json` and `design.json`, save the survey row +
   * version, then upload design/resources and rebuild autocomplete. If the file
   * upload half fails, the just-created survey (row + files) is rolled back
   * before rethrowing.
   */
  async importSurvey(zip: Buffer): Promise<SurveyDTO> {
    const imported = await this.files.extractImportZip(zip);
    if (imported.surveyJson == null) throw new SurveyDefNotAvailableException();
    if (imported.designFile == null) throw new DesignNotAvailableException();
    const exported = JSON.parse(imported.surveyJson) as ExportedSimpleSurvey;
    const dto = await this.saveSurveyData(exported.survey);
    try {
      await this.files.uploadImportedSurvey(dto.id, imported.designFile, imported.resources);
      await this.saveAutoComplete(dto.id, exported.autoCompleteResources);
    } catch (err) {
      // Roll back the survey/version rows saveSurveyData already wrote, not just
      // the files — else a failed import orphans a ghost DRAFT in the surveys
      // table (still shown by /survey/all).
      await this.surveys.deleteCascade(dto.id).catch(() => undefined);
      await this.files.deleteSurveyFiles(dto.id).catch(() => undefined);
      throw err;
    }
    return dto;
  }

  /** Persist an imported survey's metadata as a fresh DRAFT + version 1. */
  private async saveSurveyData(simple: SimpleSurveyDto): Promise<SurveyDTO> {
    const now = nowUtcString();
    const entity = this.surveys.create({
      id: randomUUID(),
      name: await this.uniqueSurveyName(simple.name),
      status: 'DRAFT',
      startDate: simple.startDate,
      endDate: simple.endDate,
      usage: usageToDb(simple.usage),
      quota: -1,
      canLockSurvey: false,
      image: simple.image,
      description: simple.description,
      navigationData: simple.navigationData,
      saveIp: simple.saveIp,
      saveTimings: simple.saveTimings,
      backgroundAudio: simple.backgroundAudio,
      recordGps: simple.recordGps,
      creationDate: now,
      lastModified: now,
    });
    await this.surveys.save(entity);
    await this.versions.save({
      version: 1,
      subVersion: 1,
      surveyId: entity.id,
      valid: simple.latestVersion.valid,
      published: false,
      schema: [],
      lastModified: now,
    });
    return surveyToDto(entity);
  }

  /**
   * Rebuild autocomplete rows from the imported resource files: read each
   * referenced resource, and if it holds a JSON array, store it. Per-resource
   * failures are swallowed.
   */
  private async saveAutoComplete(
    surveyId: string,
    resources: ExportedAutoCompleteResource[],
  ): Promise<void> {
    for (const resource of resources) {
      try {
        const text = await this.files.getText(
          surveyId,
          SurveyFolder.Resources,
          resource.filename,
        );
        const parsed: unknown = JSON.parse(text);
        if (Array.isArray(parsed)) {
          await this.autoComplete.insert(
            surveyId,
            resource.code,
            JSON.stringify(parsed),
            resource.filename,
          );
        }
      } catch {
        // Per-resource errors are swallowed — a bad file skips that autocomplete.
      }
    }
  }

  /** Copy the source's latest design into the destination as version 1. */
  private async copyDesign(source: string, destination: string): Promise<void> {
    const latest = await this.versions.findLatest(source);
    if (!latest) return;
    // Copy the design object BEFORE writing the version row: a version row with
    // no S3 design object shows on the dashboard and 500s on every editor open,
    // whereas a copied object with no row is invisible and harmless. If the copy
    // fails, no row is written and the clone simply doesn't exist.
    await this.files.copyDesign(source, destination, String(latest.version), '1');
    await this.versions.save({
      ...latest,
      surveyId: destination,
      version: 1,
      published: false,
      subVersion: 1,
      lastModified: nowUtcString(),
    });
  }

  /** A survey name unique across surveys, suffixing `(n)` as needed. */
  private async uniqueSurveyName(surveyName: string): Promise<string> {
    const existing = new Set(await this.surveys.allNames());
    if (!existing.has(surveyName)) return surveyName;
    const match = surveyName.match(/^(.+)\((\d+)\)$/);
    const base = match ? match[1] : surveyName;
    let increment = match ? parseInt(match[2], 10) : 1;
    let candidate: string;
    do {
      candidate = `${base}(${increment})`;
      increment++;
    } while (existing.has(candidate));
    return candidate;
  }

  async edit(id: string, req: EditSurveyRequest): Promise<SurveyDTO> {
    if (req.name != null && !isValidName(req.name)) {
      throw new InvalidSurveyName();
    }
    const survey = await this.findEntity(id);
    if (survey.status === 'CLOSED') {
      throw new SurveyIsClosedException();
    }

    // id / status / creationDate are immutable on edit; everything else merges,
    // preferring the request value and falling back to the current one.
    survey.name = req.name?.trim() ?? survey.name;
    survey.usage = req.usage ? usageToDb(req.usage) : survey.usage;
    // Start/end dates are assigned directly (absent → null), not merged.
    survey.startDate = req.startDate ?? null;
    survey.endDate = req.endDate ?? null;
    survey.quota = req.quota ?? survey.quota;
    survey.canLockSurvey = req.canLockSurvey ?? survey.canLockSurvey;
    survey.description = req.description ?? survey.description;
    survey.image = req.image ?? survey.image;
    survey.saveIp = req.saveIp ?? survey.saveIp;
    survey.saveTimings = req.saveTimings ?? survey.saveTimings;
    survey.backgroundAudio = req.backgroundAudio ?? survey.backgroundAudio;
    survey.recordGps = req.recordGps ?? survey.recordGps;
    const nav = survey.navigationData;
    survey.navigationData = {
      navigationMode: req.navigationMode ?? nav.navigationMode,
      allowPrevious: req.allowPrevious ?? nav.allowPrevious,
      resumeExpiryMillis: req.resumeExpiryMillis ?? nav.resumeExpiryMillis,
      skipInvalid: req.skipInvalid ?? nav.skipInvalid,
      allowIncomplete: req.allowIncomplete ?? nav.allowIncomplete,
      allowJump: req.allowJump ?? nav.allowJump,
    };
    survey.lastModified = nowUtcString();

    if (afterEnd(survey.startDate, survey.endDate)) {
      throw new InvalidSurveyDates();
    }
    return this.save(survey);
  }

  async close(id: string): Promise<SurveyDTO> {
    const survey = await this.findEntity(id);
    if (survey.status !== 'ACTIVE') {
      throw new SurveyIsNotActiveException();
    }
    survey.status = 'CLOSED';
    survey.lastModified = nowUtcString();
    return this.save(survey);
  }

  async delete(id: string): Promise<void> {
    const survey = await this.findEntity(id);
    if (survey.status === 'ACTIVE') {
      throw new SurveyIsActiveException();
    }
    // Tear the rows down FIRST, then the files. This is a deliberate trade-off
    // (diverging from a strict "clean external state before committing"
    // ordering): storage can't join the DB transaction, so *something* can leak
    // on a mid-failure. If file deletion fails after the rows are gone we orphan
    // the survey's storage prefix — a recoverable leak. The alternative (delete
    // files first) would risk the opposite: files gone but the row delete fails,
    // leaving a survey that still shows on the dashboard and 500s on open. A
    // broken, user-visible survey is worse than an invisible leak, so we prefer
    // the leak.
    // Responses and versions FK-reference the survey, so deleteCascade clears
    // them before the survey row (all within its own transaction).
    await this.surveys.deleteCascade(id);
    await this.files.deleteSurveyFiles(id);
  }

  private async save(survey: SurveyEntity): Promise<SurveyDTO> {
    return surveyToDto(await this.surveys.save(survey));
  }
}

/** Both dates present and start strictly after end (string compare is safe for
 * the zero-padded "yyyy-MM-dd HH:mm:ss" wall-clock form). */
function afterEnd(start: string | null, end: string | null): boolean {
  return start != null && end != null && start > end;
}

/** Build a fresh draft survey from a create request. */
function mapCreateRequestToEntity(
  req: SurveyCreateRequest,
  uniqueName: string,
): Partial<SurveyEntity> {
  const now = nowUtcString();
  return {
    id: randomUUID(),
    name: uniqueName,
    status: 'DRAFT',
    usage: usageToDb(req.usage ?? 'mixed'),
    quota: -1,
    description: null,
    image: null,
    startDate: null,
    endDate: null,
    canLockSurvey: true,
    creationDate: now,
    lastModified: now,
    navigationData: defaultNavigationData(),
    saveIp: true,
    saveTimings: true,
    backgroundAudio: true,
    recordGps: true,
  };
}
