import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { EntityManager } from 'typeorm';
import {
  nowUtcString,
  timestampTextTransformer,
  wallClockToInstant,
} from '../../common/datetime';
import { SnapshotsConfig } from '../../config/snapshots.config';
import { DbContext } from '../../database/db-context';
import { ComponentIndex } from '../../engine/engine.types';
import { DesignSnapshotEntity, SnapshotReason } from './design-snapshot.entity';
import { SnapshotDto } from './design.dto';

const MAX_SNAPSHOTS = 100;
const COOLDOWN_MS = 2 * 60_000;

export function snapshotReason(opts: {
  event: SnapshotReason | null;
  lastSnapshotAt: number | null;
  anchor: number;
  now: number;
  intervalMs: number;
}): SnapshotReason | null {
  const { event, lastSnapshotAt, anchor, now, intervalMs } = opts;
  if (event === SnapshotReason.RESTORE) return event;
  if (event && (lastSnapshotAt === null || now - lastSnapshotAt >= COOLDOWN_MS)) {
    return event;
  }
  return now - anchor >= intervalMs ? SnapshotReason.TIMER : null;
}

export function deletedComponents(
  before: ComponentIndex[],
  after: ComponentIndex[],
  isTracked: (code: string) => boolean,
): string[] {
  const kept = new Set(after.map((c) => c.code));
  return before
    .map((c) => c.code)
    .filter((code) => !kept.has(code) && isTracked(code));
}

export interface SnapshotInput {
  surveyId: string;
  survey: Record<string, unknown>;
  reason: SnapshotReason;
  details?: Record<string, unknown> | null;
  userId?: string | null;
}

@Injectable()
export class DesignSnapshotService {
  private readonly intervalMs: number;

  constructor(
    private readonly db: DbContext,
    config: ConfigService,
  ) {
    this.intervalMs = config.getOrThrow<SnapshotsConfig>('snapshots').intervalMs;
  }

  private repo(manager: EntityManager = this.db.manager) {
    return manager.getRepository(DesignSnapshotEntity);
  }

  async reasonFor(
    surveyId: string,
    event: SnapshotReason | null,
    anchor: () => Promise<string | null>,
  ): Promise<SnapshotReason | null> {
    const last = await this.repo().findOne({
      where: { surveyId },
      order: { createdAt: 'DESC' },
    });
    const now = Date.now();
    const lastSnapshotAt = last ? wallClockToInstant(last.createdAt) : null;
    let start = lastSnapshotAt;
    if (start === null) {
      const wallClock = await anchor();
      start = wallClock ? wallClockToInstant(wallClock) : now;
    }
    return snapshotReason({
      event,
      lastSnapshotAt,
      anchor: start,
      now,
      intervalMs: this.intervalMs,
    });
  }

  async create(input: SnapshotInput, manager: EntityManager = this.db.manager): Promise<void> {
    await manager.query(
      `INSERT INTO design_snapshots
         (id, survey_id, created_at, created_by, reason, details, data)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        randomUUID(),
        input.surveyId,
        nowUtcString(),
        input.userId ?? null,
        input.reason,
        input.details ? JSON.stringify(input.details) : null,
        JSON.stringify(input.survey),
      ],
    );
    await manager.query(
      `DELETE FROM design_snapshots WHERE survey_id = $1 AND id NOT IN (
         SELECT id FROM design_snapshots WHERE survey_id = $1
          ORDER BY created_at DESC LIMIT $2)`,
      [input.surveyId, MAX_SNAPSHOTS],
    );
  }

  async list(surveyId: string): Promise<SnapshotDto[]> {
    const rows: Array<{
      id: string;
      created_at: Date | string;
      created_by: string | null;
      first_name: string | null;
      last_name: string | null;
      reason: SnapshotReason;
      details: Record<string, unknown> | null;
    }> = await this.db.manager.query(
      `SELECT s.id, s.created_at, s.created_by, u.first_name, u.last_name,
              s.reason, s.details
         FROM design_snapshots s
         LEFT JOIN users u ON u.id = s.created_by
        WHERE s.survey_id = $1
        ORDER BY s.created_at DESC`,
      [surveyId],
    );
    return rows.map((r) => ({
      id: r.id,
      createdAt: timestampTextTransformer.from(r.created_at) as string,
      createdBy: r.created_by
        ? {
            id: r.created_by,
            name: [r.first_name, r.last_name].filter(Boolean).join(' ') || null,
          }
        : null,
      reason: r.reason,
      details: r.details,
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

  async deleteAll(surveyId: string, manager: EntityManager = this.db.manager): Promise<void> {
    await this.repo(manager).delete({ surveyId });
  }
}
