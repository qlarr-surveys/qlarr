import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EntityManager } from 'typeorm';
import {
  nowUtcString,
  timestampTextTransformer,
  wallClockToInstant,
} from '../../common/datetime';
import { DbContext } from '../../database/db-context';
import { DesignSnapshotEntity } from './design-snapshot.entity';
import { SnapshotDto } from './design.dto';

const MAX_SNAPSHOTS = 100;
const INTERVAL_MS = 60_000;

/**
 * At most one snapshot a minute: one is due when a minute has passed since the
 * save in the last snapshot (`lastAt`), or there is none.
 */
export function snapshotDue(opts: { lastAt: number | null; now: number }): boolean {
  const { lastAt, now } = opts;
  return lastAt === null || now - lastAt >= INTERVAL_MS;
}

export interface SnapshotInput {
  surveyId: string;
  survey: Record<string, unknown>;
  savedAt: string;
  userId?: string | null;
}

@Injectable()
export class DesignSnapshotService {
  constructor(private readonly db: DbContext) {}

  private repo(manager: EntityManager = this.db.manager) {
    return manager.getRepository(DesignSnapshotEntity);
  }

  async isDue(surveyId: string): Promise<boolean> {
    const last = await this.repo().findOne({
      where: { surveyId },
      order: { savedAt: 'DESC', id: 'DESC' },
    });
    return snapshotDue({
      lastAt: last ? wallClockToInstant(last.savedAt) : null,
      now: Date.now(),
    });
  }

  async create(input: SnapshotInput, manager: EntityManager = this.db.manager): Promise<void> {
    await manager.query(
      `INSERT INTO design_snapshots
         (id, survey_id, saved_at, created_by, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        randomUUID(),
        input.surveyId,
        input.savedAt,
        input.userId ?? null,
        JSON.stringify(input.survey),
      ],
    );
    // Thin out with age: every snapshot from the last hour, the newest per
    // 30-minute block for the last day, the newest per day before that.
    await manager.query(
      `DELETE FROM design_snapshots WHERE id IN (
         SELECT id FROM (
           SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY CASE
                      WHEN saved_at >= $2::timestamp - interval '1 hour' THEN id::text
                      WHEN saved_at >= $2::timestamp - interval '1 day'
                        THEN 'b' || floor(extract(epoch FROM saved_at) / 1800)
                      ELSE 'd' || saved_at::date
                    END
                    ORDER BY saved_at DESC, id DESC) AS rank
             FROM design_snapshots WHERE survey_id = $1) ranked
          WHERE rank > 1)`,
      [input.surveyId, nowUtcString()],
    );
    await manager.query(
      `DELETE FROM design_snapshots WHERE survey_id = $1 AND id NOT IN (
         SELECT id FROM design_snapshots WHERE survey_id = $1
          ORDER BY saved_at DESC, id DESC LIMIT $2)`,
      [input.surveyId, MAX_SNAPSHOTS],
    );
  }

  async list(surveyId: string): Promise<SnapshotDto[]> {
    const rows: Array<{
      id: string;
      saved_at: Date | string;
      created_by: string | null;
      first_name: string | null;
      last_name: string | null;
    }> = await this.db.manager.query(
      `SELECT s.id, s.saved_at, s.created_by, u.first_name, u.last_name
         FROM design_snapshots s
         LEFT JOIN users u ON u.id = s.created_by
        WHERE s.survey_id = $1
        ORDER BY s.saved_at DESC, s.id DESC`,
      [surveyId],
    );
    return rows.map((r) => ({
      id: r.id,
      savedAt: timestampTextTransformer.from(r.saved_at) as string,
      createdBy: r.created_by
        ? {
            id: r.created_by,
            name: [r.first_name, r.last_name].filter(Boolean).join(' ') || null,
          }
        : null,
    }));
  }

  async load(surveyId: string, id: string): Promise<Record<string, unknown> | null> {
    const row = await this.repo()
      .createQueryBuilder('s')
      .addSelect('s.data')
      .where('s.id = :id AND s.survey_id = :surveyId', { id, surveyId })
      .getOne();
    if (!row) return null;
    return JSON.parse(row.data);
  }

  /**
   * Deletes `id` and the snapshots saved after it: restoring makes it the live
   * design, which the next edit snapshots again. `saved_at` has whole-second
   * precision, so `id` breaks ties, matching the order everything else uses.
   */
  async deleteFrom(surveyId: string, id: string, manager: EntityManager): Promise<void> {
    await manager.query(
      `DELETE FROM design_snapshots
        WHERE survey_id = $1
          AND (saved_at, id) >= (
            SELECT saved_at, id FROM design_snapshots WHERE survey_id = $1 AND id = $2)`,
      [surveyId, id],
    );
  }

  async deleteAll(surveyId: string, manager: EntityManager = this.db.manager): Promise<void> {
    await this.repo(manager).delete({ surveyId });
  }
}
