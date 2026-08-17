import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as path from 'path';
import { Piscina } from 'piscina';
import { dispatch, EngineOp, EngineTask } from './engine-runtime';
import { EngineTimeoutException } from './engine.exceptions';

export interface EnginePoolOptions {
  /** Run engine ops on worker threads. When false everything runs in-process
   *  (used under Jest, where there is no compiled `.js` worker to load). */
  workersEnabled: boolean;
  /** Max worker threads. */
  poolSize: number;
  /** Hard per-call budget; on expiry the worker is terminated and the call rejects. */
  timeoutMs: number;
  /** Per-worker V8 old-space cap (MB); a heap-bomb design crashes its worker, not the server. */
  maxOldGenerationSizeMb: number;
}

/**
 * Runs the four author-JS-executing engine ops off the main event loop on a
 * Piscina worker pool, with a hard timeout and a per-worker memory cap. This is
 * the isolation boundary: a survey design that loops forever or allocates without
 * bound can, at worst, kill its own worker thread — the pool terminates it and
 * respawns a replacement — instead of freezing or OOM-ing the whole (multi-tenant)
 * server.
 *
 * When `workersEnabled` is false, calls run synchronously in-process via the same
 * `dispatch` the worker uses (no isolation, no timeout) — used by the test suite,
 * which transpiles on the fly and has no built worker file.
 */
@Injectable()
export class EnginePool implements OnModuleDestroy {
  private readonly logger = new Logger(EnginePool.name);
  private readonly piscina?: Piscina;

  constructor(private readonly options: EnginePoolOptions) {
    if (options.workersEnabled) {
      this.piscina = new Piscina({
        // Resolves to `dist/engine/engine.worker.js` at runtime (dev + prod both
        // run the compiled output).
        filename: path.resolve(__dirname, 'engine.worker.js'),
        maxThreads: options.poolSize,
        resourceLimits: {
          maxOldGenerationSizeMb: options.maxOldGenerationSizeMb,
        },
      });
    }
  }

  /** A pool with workers disabled — everything runs in-process. For tests. */
  static disabled(): EnginePool {
    return new EnginePool({
      workersEnabled: false,
      poolSize: 1,
      timeoutMs: 0,
      maxOldGenerationSizeMb: 0,
    });
  }

  async run<T>(op: EngineOp, payload: unknown): Promise<T> {
    const task = { op, payload } as EngineTask;
    if (!this.piscina) {
      return dispatch(task) as T;
    }
    // Aborting a *running* task makes Piscina terminate the worker executing it,
    // which is the only way to interrupt a synchronous infinite loop in the
    // author's compiled JS. Piscina then replaces the terminated worker.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      return (await this.piscina.run(task, { signal: controller.signal })) as T;
    } catch (err) {
      if (controller.signal.aborted) {
        this.logger.error(
          `Engine op '${op}' exceeded ${this.options.timeoutMs}ms — worker terminated`,
        );
        throw new EngineTimeoutException();
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  onModuleDestroy(): Promise<void> | undefined {
    return this.piscina?.destroy();
  }
}
