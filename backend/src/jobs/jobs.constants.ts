/** Injection token of the PgBoss instance. */
export const PG_BOSS = Symbol('PG_BOSS');

/** The schema pg-boss installs and migrates itself, on start. */
export const BOSS_SCHEMA = 'pgboss';

/** Connections in pg-boss's own pool, on top of `DB_POOL_SIZE`. */
export const BOSS_POOL_SIZE = 4;

/**
 * A running job stamps its heartbeat this often (pg-boss's minimum). A cancel
 * reaches it within half of this, and a dead worker is caught after it.
 */
export const HEARTBEAT_SECONDS = 10;

/** How often a worker looks for queued jobs. */
export const POLLING_INTERVAL_SECONDS = 1;

/** Finished jobs are deleted this long after they finished. */
export const RETENTION_SECONDS = 7 * 24 * 60 * 60;

/** Set on an error a job handler threw, kept in the failed job's output. */
export const JOB_ERROR_MARKER = 'qlarrJobError';
