# syntax=docker/dockerfile:1

# Qlarr backend (NestJS) — multi-stage build.
#
# IMPORTANT: the build context is the REPO ROOT (not backend/), so the local
# `file:` dependency @qlarr/design-core (../shared/design-core) resolves at
# install/build time. Build with:  docker build -f backend/Dockerfile .
# CI passes `context: .` for exactly this reason.
#
# Debian (bookworm-slim), NOT alpine: `ffmpeg-static` ships a glibc-linked
# binary and `sharp` ships prebuilt libvips binaries — both work on glibc out
# of the box and would break on musl/alpine. No native compilation happens
# (sharp/ffmpeg use prebuilds; bcryptjs/pg/yauzl/yazl are pure JS), so the slim
# image with no build-essential is sufficient.

# ---- Builder: install all deps and compile TS -> dist/ ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Shared local package first: the backend's `prebuild` (tsup) compiles its dist/.
COPY shared/design-core ./shared/design-core

# Backend manifests, then the reproducible `npm ci` (package-lock.json is committed).
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci

# Backend sources, then build. `prebuild` builds @qlarr/design-core, then nest build.
COPY backend/ ./
RUN npm run build

# ---- Runner: prod deps only + compiled output ----
FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
# The backend treats `timestamp without time zone` columns as UTC wall clocks;
# pin the process zone so pg builds/reads Dates in UTC and no DST gap can drift a
# value. Set here (before node starts) so it can't be missed at runtime.
ENV TZ=UTC
WORKDIR /app

# The shared package artifact is self-contained (dist bundles its only runtime
# dep via tsup noExternal), so the runner needs just its package.json + dist.
COPY --from=builder /app/shared/design-core/package.json ./shared/design-core/package.json
COPY --from=builder /app/shared/design-core/dist ./shared/design-core/dist

COPY backend/package*.json ./backend/
WORKDIR /app/backend
# design-core has no install/prepare script, so --omit=dev just symlinks it;
# ffmpeg-static / sharp install scripts still run to fetch their binaries.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/backend/dist ./dist

# Default port (overridable at runtime via PORT).
EXPOSE 8080

# Drop root.
USER node

CMD ["node", "dist/main.js"]
