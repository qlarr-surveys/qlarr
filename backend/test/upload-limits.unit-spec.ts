import { DynamicModule, RequestMethod, Type } from '@nestjs/common';
import {
  INTERCEPTORS_METADATA,
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
  SELF_DECLARED_DEPS_METADATA,
} from '@nestjs/common/constants';
import { MULTER_MODULE_OPTIONS } from '@nestjs/platform-express/multer/files.constants';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from '../src/app.module';
import { MAX_UPLOAD_BYTES } from '../src/common/upload';

/**
 * Regression guard for uncapped multipart uploads. Nest's multer interceptors
 * take their options from the route (`FileInterceptor('file', opts)`) merged
 * over an `@Optional()` MULTER_MODULE_OPTIONS — which only reaches controllers
 * declared in the module that registered MulterModule. A route without its own
 * `limits` therefore buffers an arbitrarily large body into the heap, however
 * MulterModule is registered elsewhere (that is exactly how the three
 * SurveysModule routes ran uncapped behind a dead AppModule registration).
 *
 * So: walk every controller reachable from AppModule, instantiate each multer
 * interceptor the way a feature module does (no module options injected), and
 * require an explicit `fileSize` no larger than MAX_UPLOAD_BYTES.
 */

interface MulterInterceptor {
  multer?: { limits?: { fileSize?: number } };
}

interface UploadRoute {
  route: string;
  fileSize: number | undefined;
}

type ModuleEntry = Type<unknown> | DynamicModule | { forwardRef: () => unknown };

/** Every controller class reachable from `root` through module imports. */
function collectControllers(root: Type<unknown>): Set<Type<unknown>> {
  const seen = new Set<unknown>();
  const controllers = new Set<Type<unknown>>();
  const visit = (entry: ModuleEntry | undefined): void => {
    if (!entry || seen.has(entry)) return;
    seen.add(entry);
    if ('forwardRef' in entry) return visit(entry.forwardRef() as ModuleEntry);
    // Dynamic modules carry imports/controllers on the object; the class still
    // carries whatever its own @Module() declared.
    if ('module' in entry) {
      (entry.imports ?? []).forEach((i) => visit(i as ModuleEntry));
      (entry.controllers ?? []).forEach((c) => controllers.add(c));
      return visit(entry.module);
    }
    const meta = (key: string): unknown[] => Reflect.getMetadata(key, entry) ?? [];
    meta(MODULE_METADATA.IMPORTS).forEach((i) => visit(i as ModuleEntry));
    meta(MODULE_METADATA.CONTROLLERS).forEach((c) => controllers.add(c as Type<unknown>));
  };
  visit(root);
  return controllers;
}

/** A multer interceptor injects MULTER_MODULE_OPTIONS (File/Files/AnyFiles/FileFields/NoFiles). */
const isMulterInterceptor = (interceptor: unknown): interceptor is Type<MulterInterceptor> =>
  typeof interceptor === 'function' &&
  ((Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, interceptor) ?? []) as Array<{
    param: unknown;
  }>).some((dep) => dep.param === MULTER_MODULE_OPTIONS);

const joinPath = (...parts: unknown[]): string =>
  '/' +
  parts
    .map((p) => String(p ?? '').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');

/** Every route guarded by a multer interceptor, with its effective fileSize limit. */
function collectUploadRoutes(): UploadRoute[] {
  const routes: UploadRoute[] = [];
  for (const controller of collectControllers(AppModule)) {
    const classInterceptors: unknown[] =
      Reflect.getMetadata(INTERCEPTORS_METADATA, controller) ?? [];
    for (let proto = controller.prototype; proto && proto !== Object.prototype; ) {
      for (const name of Object.getOwnPropertyNames(proto)) {
        const handler = Object.getOwnPropertyDescriptor(proto, name)?.value;
        if (name === 'constructor' || typeof handler !== 'function') continue;
        if (Reflect.getMetadata(METHOD_METADATA, handler) === undefined) continue;
        const interceptors: unknown[] = [
          ...classInterceptors,
          ...(Reflect.getMetadata(INTERCEPTORS_METADATA, handler) ?? []),
        ];
        for (const Interceptor of interceptors.filter(isMulterInterceptor)) {
          // No argument = no MULTER_MODULE_OPTIONS, as in any feature module.
          const instance = new Interceptor();
          routes.push({
            route: `${RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler)]} ${joinPath(
              Reflect.getMetadata(PATH_METADATA, controller),
              Reflect.getMetadata(PATH_METADATA, handler),
            )} (${controller.name}.${name})`,
            fileSize: instance.multer?.limits?.fileSize,
          });
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
  }
  return routes;
}

/** Multer interceptor call sites in src, comments stripped. */
function countInterceptorCallSites(dir: string): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countInterceptorCallSites(path);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('-spec.ts')) {
      const code = readFileSync(path, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      count += (code.match(/\b(?:File|Files|AnyFiles|FileFields|NoFiles)Interceptor\(/g) ?? [])
        .length;
    }
  }
  return count;
}

describe('multipart upload limits', () => {
  const routes = collectUploadRoutes();

  it('finds every multer interceptor declared in src', () => {
    // If a call site isn't reachable from AppModule (or the walk above misses
    // a module shape), the per-route check below would silently skip it.
    expect(routes.length).toBeGreaterThanOrEqual(
      countInterceptorCallSites(join(__dirname, '..', 'src')),
    );
    expect(routes.map((r) => r.route)).toEqual(
      expect.arrayContaining([
        'POST /survey/import (SurveyCreateController.import)',
        'POST /survey/:surveyId/resource (SurveyResourceController.upload)',
        'POST /autocomplete/:surveyId/:componentId (AutoCompleteAdminController.upload)',
      ]),
    );
  });

  it('caps every upload route with its own fileSize limit (no global fallback)', () => {
    const uncapped = routes
      .filter((r) => !(typeof r.fileSize === 'number' && r.fileSize <= MAX_UPLOAD_BYTES))
      .map((r) => `${r.route}: fileSize=${r.fileSize}`);
    expect(uncapped).toEqual([]);
  });
});
