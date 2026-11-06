import variant from '@jitl/quickjs-ng-wasmfile-release-sync';
import { newQuickJSWASMModuleFromVariant } from 'quickjs-emscripten-core';

const MEMORY_LIMIT_BYTES = 16 * 1024 * 1024;
// Must stay well below the WASM stack: at 256 KB deep recursion overflows that
// stack instead of raising a catchable error inside the guest.
const MAX_STACK_BYTES = 64 * 1024;

/** Call an engine script entry point inside the sandbox. */
export type RunScript = (
  entryPoint: 'navigate' | 'calculate',
  input: string,
) => string;

/**
 * Load the engine script, whose inputs embed survey-author expressions, into
 * QuickJS on its own WASM instance and hand `use` a way to call it. No host
 * objects reach it, only strings cross the boundary, and nothing survives `use`.
 * Calls within one `use` share the instance, so one survey's work can be batched
 * but different surveys must not share it. It has no deadline of its own — a
 * runaway script is stopped by the pool terminating the worker.
 *
 * `print` is stubbed because the engine script logs through it and QuickJS,
 * like Node, doesn't define it.
 */
export async function withSandbox<T>(
  engineScript: string,
  use: (run: RunScript) => T,
): Promise<T> {
  const quickJs = await newQuickJSWASMModuleFromVariant(variant);
  const runtime = quickJs.newRuntime();
  runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);
  runtime.setMaxStackSize(MAX_STACK_BYTES);
  const context = runtime.newContext();
  try {
    context
      .unwrapResult(context.evalCode(`var print = function () {};\n${engineScript}`))
      .dispose();
    return use((entryPoint, input) => {
      context
        .newString(input)
        .consume((params) => context.setProp(context.global, 'params', params));
      return context
        .unwrapResult(context.evalCode(`${entryPoint}(JSON.parse(params));`))
        .consume((result) => context.getString(result));
    });
  } finally {
    context.dispose();
    runtime.dispose();
  }
}
