/**
 * Node module hooks that let the backend import the designer's Redux slice
 * straight from ../frontend/src, so a design edit made on the server runs the
 * same reducer code as the designer (see src/modules/design/design-slice.ts).
 * Registered with `node --import ./frontend-src/register.mjs`.
 *
 * Adapted from frontend-cloud's ai/src-alias-loader.mjs. It handles only what
 * the pure slice needs (state/design/designState.js must keep importing pure
 * modules, never React/MUI):
 * - `~/` resolves to frontend/src, like the Vite alias
 * - extensionless relative imports are probed, like Vite does
 * - frontend/src `.js` files are transpiled to ESM with esbuild, as Vite loads them
 * - bare imports from frontend/src resolve from the backend's node_modules, so
 *   the frontend's own dependencies never need installing here
 * - packages with a `module` field but no `exports` load their ESM build, since
 *   Node can't see the named exports of their CommonJS entry (@reduxjs/toolkit)
 */
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

// frontend/src next to backend/, in the repo and in the Docker image alike.
const SRC_URL = new URL("../../frontend/src/", import.meta.url);
const BACKEND_URL = new URL("../package.json", import.meta.url);
const NODE_MODULES_URL = new URL("../node_modules/", import.meta.url);
const EXT_CANDIDATES = [".js", ".jsx", ".mjs", "/index.js", "/index.jsx", "/index.mjs"];

const pkgJsonCache = new Map();

// Roots of packages redirected to their `module` build. That bundler-style ESM
// uses extensionless relative imports, so probing extends inside them.
const moduleFieldRoots = new Set();

function readPkgJson(pkgName) {
  if (pkgJsonCache.has(pkgName)) return pkgJsonCache.get(pkgName);
  const pkgJsonUrl = new URL(`${pkgName}/package.json`, NODE_MODULES_URL);
  const pkgJsonPath = fileURLToPath(pkgJsonUrl);
  const result = existsSync(pkgJsonPath)
    ? { pkg: JSON.parse(readFileSync(pkgJsonPath, "utf8")), pkgJsonUrl }
    : null;
  pkgJsonCache.set(pkgName, result);
  return result;
}

function isBare(specifier) {
  return !/^(\.|\/|~\/|node:|file:)/.test(specifier);
}

// "foo" or "@scope/foo": a package's main entry, not a subpath.
function isBarePackageMain(specifier) {
  if (!isBare(specifier)) return false;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.length === 2 : parts.length === 1;
}

function probe(baseUrl) {
  if (extname(fileURLToPath(baseUrl))) return baseUrl;
  for (const suffix of EXT_CANDIDATES) {
    const candidate = new URL(baseUrl.href + suffix);
    if (existsSync(fileURLToPath(candidate))) return candidate;
  }
  return null;
}

function isUnderSrc(url) {
  return Boolean(url) && url.startsWith(SRC_URL.href);
}

function isUnderModuleFieldRoot(url) {
  if (!url) return false;
  for (const root of moduleFieldRoots) {
    if (url.startsWith(root)) return true;
  }
  return false;
}

// A package with a `module` field and no `exports`: load the ESM build, the
// way Vite/Webpack/Rollup do.
function resolveModuleField(pkgName) {
  const info = readPkgJson(pkgName);
  if (!info || info.pkg.exports || typeof info.pkg.module !== "string") return null;
  const esmUrl = new URL(info.pkg.module, info.pkgJsonUrl);
  if (!existsSync(fileURLToPath(esmUrl))) return null;
  moduleFieldRoots.add(new URL(".", info.pkgJsonUrl).href);
  return esmUrl;
}

export function load(url, context, nextLoad) {
  if (url.startsWith("file:") && isUnderSrc(url) && /\.jsx?$/.test(url)) {
    const filePath = fileURLToPath(url);
    const { code } = transformSync(readFileSync(filePath, "utf8"), {
      loader: "jsx",
      jsx: "automatic",
      format: "esm",
      sourcefile: filePath,
      target: "esnext",
    });
    return { format: "module", source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}

export function resolve(specifier, context, nextResolve) {
  // Only the slice's own import graph is touched; any other import the backend
  // makes resolves as usual.
  const fromSlice =
    isUnderSrc(context.parentURL) || isUnderModuleFieldRoot(context.parentURL);

  if (fromSlice && isBarePackageMain(specifier)) {
    const esmUrl = resolveModuleField(specifier);
    if (esmUrl) return { url: esmUrl.href, format: "module", shortCircuit: true };
  }

  if (specifier.startsWith("~/")) {
    const resolved = probe(new URL(specifier.slice(2), SRC_URL));
    if (resolved) return { url: resolved.href, shortCircuit: true };
  }

  if (
    fromSlice &&
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !extname(specifier)
  ) {
    const resolved = probe(new URL(specifier, context.parentURL));
    if (resolved) {
      // Files in a `module` build are ESM, but their package has no
      // `"type": "module"`, so say so. frontend/src files go through `load`.
      return isUnderModuleFieldRoot(context.parentURL)
        ? { url: resolved.href, format: "module", shortCircuit: true }
        : { url: resolved.href, shortCircuit: true };
    }
  }

  if (isBare(specifier) && isUnderSrc(context.parentURL)) {
    return nextResolve(specifier, { ...context, parentURL: BACKEND_URL.href });
  }

  return nextResolve(specifier, context);
}
