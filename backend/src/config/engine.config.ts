import { registerAs } from '@nestjs/config';
import * as os from 'os';

export interface EngineConfig {
  /** Run engine ops on worker threads (off the main event loop). */
  workersEnabled: boolean;
  /** Max engine worker threads. */
  poolSize: number;
  /** Hard per-call budget in ms; on expiry the worker is terminated. */
  timeoutMs: number;
  /** Per-worker V8 old-space cap in MB. */
  maxOldGenerationSizeMb: number;
}

/**
 * Engine worker-pool tuning. All optional — sane defaults derived from the host.
 * Workers default ON, but auto-OFF under Jest (`JEST_WORKER_ID` set), where the
 * suite transpiles on the fly and has no compiled `.js` worker to spawn.
 */
export default registerAs('engine', (): EngineConfig => {
  const cpus = os.cpus()?.length ?? 2;
  return {
    workersEnabled: process.env.ENGINE_WORKERS
      ? process.env.ENGINE_WORKERS === 'true'
      : process.env.JEST_WORKER_ID === undefined,
    poolSize: process.env.ENGINE_POOL_SIZE
      ? parseInt(process.env.ENGINE_POOL_SIZE, 10)
      : Math.max(1, cpus - 1),
    timeoutMs: process.env.ENGINE_TIMEOUT_MS
      ? parseInt(process.env.ENGINE_TIMEOUT_MS, 10)
      : 5000,
    maxOldGenerationSizeMb: process.env.ENGINE_MAX_OLD_GEN_MB
      ? parseInt(process.env.ENGINE_MAX_OLD_GEN_MB, 10)
      : 512,
  };
});
