import { dispatch, EngineTask } from './engine-runtime';

/**
 * Piscina worker entrypoint. Each task compiles/evaluates survey-author
 * JavaScript through the KMP engine on this thread; if it loops forever or
 * exhausts the heap, the pool aborts the task — Piscina then *terminates this
 * worker* and spins up a fresh one — so the main event loop is never blocked.
 *
 * The default export is the task handler (Piscina resolves `module.default` for
 * the default task name). Keep this file free of Nest/DI so the worker stays a
 * thin, fast-loading shell around `engine-runtime`.
 */
export default function engineWorker(task: EngineTask): unknown {
  return dispatch(task);
}
