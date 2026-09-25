# syntax=docker/dockerfile:1

# Qlarr backend (NestJS) — multi-stage build.
#
# Debian (bookworm-slim), NOT alpine: `ffmpeg-static` ships a glibc-linked
# binary and `sharp` ships prebuilt libvips binaries — both work on glibc out
# of the box and would break on musl/alpine. No native compilation happens
# (sharp/ffmpeg use prebuilds; bcryptjs/pg/yauzl/yazl are pure JS), so the slim
# image with no build-essential is sufficient.
#
# Build context is the repo ROOT (docker build -f backend/Dockerfile .): the
# backend runs the designer's Redux slice from ../frontend/src through
# frontend-src/loader.mjs, so the image keeps frontend/src next to backend/, as
# in the repo. Only the source is copied; its imports resolve from the backend's
# node_modules. Dockerfile.dockerignore keeps the rest of the repo out.

# ---- Builder: install all deps and compile TS -> dist/ ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app/backend

# package-lock.json is committed, so use the reproducible `npm ci`.
COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# ---- Runner: prod deps only + compiled output ----
FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
# The backend treats `timestamp without time zone` columns as UTC wall clocks;
# pin the process zone so pg builds/reads Dates in UTC and no DST gap can drift a
# value. Set here (before node starts) so it can't be missed at runtime.
ENV TZ=UTC
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/backend/dist ./dist
COPY backend/frontend-src ./frontend-src
COPY frontend/src /app/frontend/src

# Default port (overridable at runtime via PORT).
EXPOSE 8080

# Drop root.
USER node

CMD ["node", "--import", "./frontend-src/register.mjs", "dist/main.js"]
