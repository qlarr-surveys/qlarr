import { Injectable } from '@nestjs/common';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { DbContext } from '../../database/db-context';
import { VersionEntity } from '../surveys/version.entity';

/**
 * Data-access for the `versions` table — the per-survey design version
 * ledger (version / sub-version / valid / published / schema). Shared by
 * DesignService (the edit + publish loop) and SurveysService (create / clone /
 * import / export). Lives in the design module because SurveysModule already
 * imports DesignModule, so the dependency points one way (surveys → design) and
 * both can inject it without a cycle. Resolves the repository per call from the
 * request-scoped manager.
 */
@Injectable()
export class VersionRepository {
  constructor(private readonly db: DbContext) {}

  private get repo(): Repository<VersionEntity> {
    return this.db.manager.getRepository(VersionEntity);
  }

  /** The latest version row for a survey (max version — the working copy). */
  findLatest(surveyId: string): Promise<VersionEntity | null> {
    return this.repo.findOne({
      where: { surveyId },
      order: { version: 'DESC' },
    });
  }

  /** The latest published version row for a survey, or null if never published. */
  findLatestPublished(surveyId: string): Promise<VersionEntity | null> {
    return this.repo.findOne({
      where: { surveyId, published: true },
      order: { version: 'DESC' },
    });
  }

  /** A specific version row for a survey. */
  findByVersion(surveyId: string, version: number): Promise<VersionEntity | null> {
    return this.repo.findOne({ where: { surveyId, version } });
  }

  /**
   * Persist a version row (insert or update by its composite key). Pass a
   * transactional `manager` to enroll the write in a caller's transaction;
   * defaults to the request-scoped manager.
   */
  save(
    data: DeepPartial<VersionEntity>,
    manager: EntityManager = this.db.manager,
  ): Promise<VersionEntity> {
    const repo = manager.getRepository(VersionEntity);
    return repo.save(repo.create(data));
  }

  /** Delete a specific version row (publish fold). Accepts a transactional manager. */
  async deleteVersion(
    surveyId: string,
    version: number,
    manager: EntityManager = this.db.manager,
  ): Promise<void> {
    await manager.getRepository(VersionEntity).delete({ surveyId, version });
  }

  /**
   * Re-point a survey's responses from one version to another (publish fold).
   * Lives here rather than on ResponseRepository because ResponsesModule imports
   * DesignModule, so depending back the other way would form a module cycle.
   * Accepts a transactional manager so it can share the fold's transaction.
   */
  async repointResponses(
    surveyId: string,
    fromVersion: number,
    toVersion: number,
    manager: EntityManager = this.db.manager,
  ): Promise<void> {
    await manager.query(
      `UPDATE responses SET version = $3 WHERE survey_id = $1 AND version = $2`,
      [surveyId, fromVersion, toVersion],
    );
  }
}
