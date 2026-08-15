import { Inject, Injectable } from '@nestjs/common';
import { nowUtcString } from '../../common/datetime';
import { EngineService } from '../../engine/engine.service';
import { ValidationJsonOutput } from '../../engine/engine.types';
import { FILE_HELPER, FileHelper } from '../../integrations/filesystem/file-helper';
import { SurveyFolder } from '../../integrations/filesystem/survey-folder';
import { DbContext } from '../../database/db-context';
import { statusFromDb } from '../surveys/survey.enums';
import { SurveyEntity } from '../surveys/survey.entity';
import {
  SurveyIsClosedException,
  SurveyNotFoundException,
} from '../surveys/survey.exceptions';
import { VersionEntity } from '../surveys/version.entity';
import { VersionRepository } from './version.repository';
import { DesignDiffDto, DesignDto, PublishInfo, VersionDto } from './design.dto';
import {
  DesignException,
  DesignOutOfSyncException,
  InvalidDesignException,
  NoPublishedVersionException,
} from './design.exceptions';

export interface ProcessedSurvey {
  survey: SurveyEntity;
  version: VersionEntity;
  output: ValidationJsonOutput;
}

/**
 * Survey design load + edit (the edit loop). A design
 * is the engine's `ValidationJsonOutput`, stored per-version as an S3 file under
 * `design/<version>`; the `versions` row tracks version/sub-version/valid/
 * published. Each edit re-validates through the engine and writes a new version
 * (or bumps the sub-version of an unpublished one).
 *
 * `changeCode`, `publish` and `offlineDesignDiff` land in the next slice.
 */
@Injectable()
export class DesignService {
  constructor(
    private readonly db: DbContext,
    private readonly versions: VersionRepository,
    @Inject(FILE_HELPER) private readonly files: FileHelper,
    private readonly engine: EngineService,
  ) {}

  private surveys() {
    return this.db.manager.getRepository(SurveyEntity);
  }

  async getDesign(surveyId: string): Promise<DesignDto> {
    const processed = await this.getProcessedSurvey(surveyId, false);
    return {
      designerInput: this.engine.toDesignerInput(processed.output),
      versionDto: this.toVersionDto(processed.version, processed.survey.status),
    };
  }

  async setDesign(
    surveyId: string,
    design: Record<string, unknown>,
    version: number,
    sampleSurvey = false,
  ): Promise<DesignDto> {
    const survey = await this.surveys().findOne({ where: { id: surveyId } });
    if (!survey) throw new SurveyNotFoundException();
    if (survey.status === 'CLOSED') throw new SurveyIsClosedException();

    const latest = await this.versions.findLatest(surveyId);
    if (!latest) throw new DesignException();
    if (version !== latest.version) {
      throw new DesignOutOfSyncException(latest.subVersion);
    }
    const versionToSave = latest.published ? latest.version + 1 : latest.version;
    const subVersionToSave = latest.published ? 1 : latest.subVersion + 1;

    const output = sampleSurvey
      ? await this.engine.validate(JSON.stringify(design))
      : await this.engine.process(
          design,
          (await this.getProcessedSurvey(surveyId, false)).output.survey,
        );

    // S3 upload before the DB writes (it can't join the transaction); an orphan
    // design file on a mid-failure is overwritten by the next setDesign.
    await this.files.uploadText(
      surveyId,
      SurveyFolder.Design,
      JSON.stringify(output),
      String(versionToSave),
    );

    // Version row + survey stamp as one transaction.
    survey.lastModified = nowUtcString();
    const entity = await this.db.manager.transaction(async (tx) => {
      const e = await this.versions.save(
        {
          version: versionToSave,
          surveyId,
          subVersion: subVersionToSave,
          valid: isValid(output),
          published: false,
          schema: output.schema,
          lastModified: nowUtcString(),
        },
        tx,
      );
      await tx.getRepository(SurveyEntity).save(survey);
      return e;
    });

    return {
      designerInput: this.engine.toDesignerInput(output),
      versionDto: this.toVersionDto(entity, survey.status),
    };
  }

  /** Rename a component code, re-validate, and store as a new version. */
  async changeCode(surveyId: string, from: string, to: string): Promise<DesignDto> {
    const survey = await this.surveys().findOne({ where: { id: surveyId } });
    if (!survey) throw new SurveyNotFoundException();
    if (survey.status === 'CLOSED') throw new SurveyIsClosedException();

    const latest = await this.versions.findLatest(surveyId);
    if (!latest) throw new DesignException();
    const versionToSave = latest.published ? latest.version + 1 : latest.version;
    const subVersionToSave = latest.published ? 1 : latest.subVersion + 1;

    const savedDesign = await this.files.getText(
      surveyId,
      SurveyFolder.Design,
      String(latest.version),
    );
    const output = await this.engine.changeCode(savedDesign, from, to);

    await this.files.uploadText(
      surveyId,
      SurveyFolder.Design,
      JSON.stringify(output),
      String(versionToSave),
    );
    const entity = await this.versions.save({
      version: versionToSave,
      surveyId,
      subVersion: subVersionToSave,
      valid: isValid(output),
      published: false,
      schema: output.schema,
      lastModified: nowUtcString(),
    });
    survey.lastModified = nowUtcString();
    await this.surveys().save(survey);

    return {
      designerInput: this.engine.toDesignerInput(output),
      versionDto: this.toVersionDto(entity, survey.status),
    };
  }

  /**
   * Publish the working version. Enforces version/valid/
   * continuity checks, activates the survey, and — for a re-publish with no
   * material change (identical component index) — collapses the working version
   * back into the published one (migrating responses + bumping its sub-version)
   * rather than creating a new published version. Finally prunes unused resources.
   */
  async publish(
    surveyId: string,
    version: number,
    subVersion: number,
  ): Promise<VersionDto> {
    const latest = await this.versions.findLatest(surveyId);
    if (!latest) throw new DesignException();
    const latestPublished = await this.versions.findLatestPublished(surveyId);
    if (version !== latest.version || subVersion !== latest.subVersion) {
      throw new DesignOutOfSyncException(latest.subVersion);
    }
    if (!latest.valid) throw new InvalidDesignException();
    if (
      (!latestPublished && latest.version !== 1) ||
      (latestPublished && latest.version - latestPublished.version > 1)
    ) {
      throw new DesignOutOfSyncException(latest.subVersion);
    }

    const survey = await this.surveys().findOne({ where: { id: surveyId } });
    if (!survey) throw new SurveyNotFoundException();
    if (survey.status !== 'ACTIVE') {
      survey.status = 'ACTIVE';
      survey.lastModified = nowUtcString();
      await this.surveys().save(survey);
    }

    const newJson = await this.files.getText(
      surveyId,
      SurveyFolder.Design,
      String(latest.version),
    );
    const newOutput = JSON.parse(newJson) as ValidationJsonOutput;

    let saved: VersionEntity;
    if (!latestPublished) {
      // First publish ever — a single row write, atomic on its own.
      saved = await this.versions.save({
        ...latest,
        published: true,
        version: 1,
        subVersion: 1,
        lastModified: nowUtcString(),
      });
    } else {
      const oldJson = await this.files.getText(
        surveyId,
        SurveyFolder.Design,
        String(latestPublished.version),
      );
      const oldIndex = (JSON.parse(oldJson) as ValidationJsonOutput).componentIndexList;
      survey.lastModified = nowUtcString();

      if (sameComponentIndex(oldIndex, newOutput.componentIndexList)) {
        // No material change → fold the working version into the published one.
        // Upload the folded design to the published slot FIRST: S3 can't join
        // the DB transaction, so ordering it before the row delete leaves both
        // design files on a mid-failure (recoverable) rather than neither.
        await this.files.uploadText(
          surveyId,
          SurveyFolder.Design,
          newJson,
          String(latestPublished.version),
        );
        // Re-point responses, drop the working version row, bump the published
        // row, and stamp the survey as ONE transaction — a failure here rolls
        // back all of it, so responses never end up pointing at a deleted
        // version.
        saved = await this.db.manager.transaction(async (tx) => {
          await this.versions.repointResponses(
            surveyId,
            latest.version,
            latestPublished.version,
            tx,
          );
          await this.versions.deleteVersion(surveyId, latest.version, tx);
          await tx.getRepository(SurveyEntity).save(survey);
          return this.versions.save(
            {
              ...latestPublished,
              published: true,
              subVersion: latestPublished.subVersion + 1,
              lastModified: nowUtcString(),
            },
            tx,
          );
        });
        // Post-commit cleanup: the working version row is gone, so its design
        // file is now unreferenced; an orphan here is harmless and re-pruned.
        await this.files.delete(surveyId, SurveyFolder.Design, String(latest.version));
      } else {
        // Material change → a new published version + survey stamp, together.
        saved = await this.db.manager.transaction(async (tx) => {
          await tx.getRepository(SurveyEntity).save(survey);
          return this.versions.save(
            {
              ...latest,
              published: true,
              subVersion: 1,
              lastModified: nowUtcString(),
            },
            tx,
          );
        });
      }
    }

    const resources = this.engine.resources(newOutput);
    if (survey.image) resources.push(survey.image);
    await this.cleanUnusedResources(surveyId, new Set(resources));

    return this.toVersionDto(saved, survey.status);
  }

  /**
   * Offline sync diff. If the client already has
   * the latest published version, echo its publish marker; otherwise return the
   * published design plus the resource files that changed since the client's
   * last sync.
   */
  async offlineDesignDiff(
    surveyId: string,
    publishInfo: PublishInfo,
  ): Promise<DesignDiffDto> {
    const survey = await this.surveys().findOne({ where: { id: surveyId } });
    if (!survey) throw new SurveyNotFoundException();
    if (survey.status === 'CLOSED') throw new SurveyIsClosedException();

    const published = await this.versions.findLatestPublished(surveyId);
    if (!published) throw new NoPublishedVersionException();

    if (
      published.version === publishInfo.version &&
      published.subVersion === publishInfo.subVersion
    ) {
      return { files: [], publishInfo };
    }

    const json = await this.files.getText(
      surveyId,
      SurveyFolder.Design,
      String(published.version),
    );
    const output = JSON.parse(json) as ValidationJsonOutput;
    const files = await this.files.surveyResourcesFiles(
      surveyId,
      this.engine.resources(output),
      publishInfo.lastModified,
    );
    return {
      files,
      publishInfo: {
        version: published.version,
        subVersion: published.subVersion,
        lastModified: published.lastModified ?? '',
      },
      validationJsonOutput: output,
    };
  }

  /** Delete resource files no longer referenced by the (published) design. */
  private async cleanUnusedResources(
    surveyId: string,
    keep: Set<string>,
  ): Promise<void> {
    const files = await this.files.listSurveyResources(surveyId);
    for (const file of files) {
      if (!file.name.endsWith('metadata') && !keep.has(file.name)) {
        try {
          await this.files.delete(surveyId, SurveyFolder.Resources, file.name);
        } catch {
          // best-effort cleanup
        }
      }
    }
  }

  /** Load a survey's processed design (from S3) for the latest or published version. */
  async getProcessedSurvey(
    surveyId: string,
    published: boolean,
  ): Promise<ProcessedSurvey> {
    const survey = await this.surveys().findOne({ where: { id: surveyId } });
    if (!survey) throw new SurveyNotFoundException();
    const version = published
      ? await this.versions.findLatestPublished(surveyId)
      : await this.versions.findLatest(surveyId);
    if (!version) throw new DesignException();
    const json = await this.files.getText(
      surveyId,
      SurveyFolder.Design,
      String(version.version),
    );
    return { survey, version, output: JSON.parse(json) as ValidationJsonOutput };
  }

  /** Load a survey's processed design (from S3) for a specific version. */
  async getProcessedSurveyByVersion(
    surveyId: string,
    version: number,
  ): Promise<ProcessedSurvey> {
    const survey = await this.surveys().findOne({ where: { id: surveyId } });
    if (!survey) throw new SurveyNotFoundException();
    const versionRow = await this.versions.findByVersion(surveyId, version);
    if (!versionRow) throw new DesignException();
    const json = await this.files.getText(
      surveyId,
      SurveyFolder.Design,
      String(versionRow.version),
    );
    return { survey, version: versionRow, output: JSON.parse(json) as ValidationJsonOutput };
  }

  private toVersionDto(v: VersionEntity, statusDb: string | null): VersionDto {
    return {
      surveyId: v.surveyId,
      version: v.version,
      subVersion: v.subVersion,
      valid: v.valid,
      published: v.published,
      lastModified: v.lastModified,
      status: statusFromDb(statusDb),
    };
  }
}

/** A design is valid when its survey has no `errors`. */
function isValid(output: ValidationJsonOutput): boolean {
  const errors = output.survey?.errors;
  return Array.isArray(errors) ? errors.length === 0 : true;
}

/** Structural equality of two component-index lists. */
function sameComponentIndex(a: unknown[], b: unknown[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
