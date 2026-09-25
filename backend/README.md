# Qlarr Backend (NestJS)

The open-source Qlarr survey backend. Single-tenant: one database, one
organization, an admin seeded on first run. It binds the same
`@qlarr/survey-engine` build the web/Android renderers use, so design, run,
navigation, responses, exports and offline sync all share one engine.

## Stack

- **NestJS 10** (Node ≥ 20), TypeScript
- **TypeORM** over **Postgres** (`synchronize: false`; an in-process baseline
  migration owns the schema)
- **Passport JWT** auth (access + refresh, no rotation)
- **Local-disk file storage** (`LocalFileHelper`) — survey resources, designs and
  response files under `{FILE_SYSTEM_ROOT_FOLDER}/{surveyId}/{folder}/{file}`
- Email via **nodemailer** (leave `MAIL_HOST` empty to log instead of send)

## Develop

From this folder:

```bash
npm install
npm run start:dev            # watch mode on PORT (default 8080)
```

Copy `.env.example` to `.env` and set at least `DB_*`, `JWT_SECRET` and
`FRONTEND_URL` first. On first startup, when the users table is empty, an admin
is seeded:

```
email:    admin@admin.admin
password: admin
```

Disable the seeder with `SEED_ADMIN_USER=false`.

```bash
curl http://localhost:8080/health
```

## Test

```bash
npm run test:unit    # fast, no Docker
npm run test:int     # integration — spins up real Postgres via Testcontainers (needs Docker)
npm run test:e2e     # end-to-end app boot
npm run test:slice   # the designer's Redux slice through the loader (after npm run build)
```

`test:int` / `test:e2e` require a running Docker daemon (Testcontainers throws
away a real Postgres per run — the only faithful coverage for the SQL-level
parts: native queries, JSONB, the response-index trigger).

## Designer code

Design edits made on the server can run the designer's own Redux slice
(`frontend/src/state/design/designState.js`), so a text written here gets the
same format instructions and resources as one typed in the designer
(`src/modules/design/design-slice.ts`). `frontend-src/loader.mjs` maps `~/` to
`../frontend/src` and transpiles it; every start script and the Docker `CMD`
register it with `--import ./frontend-src/register.mjs`. The slice must keep
importing pure modules only (no React/MUI). Its package imports
(`@reduxjs/toolkit`, `lodash.clonedeep`, `axios`) resolve from the backend's
`node_modules`, so they are backend dependencies too. The Docker image is built
from the repo root so it can carry `frontend/src`: `docker build -f backend/Dockerfile .`

## Storage

Files live under `FILE_SYSTEM_ROOT_FOLDER` (default `local-data`), one directory
per survey, with a `.metadata` sidecar per file (content type / etag / length).
The `FileHelper` interface is the swap seam: a different build can bind another
implementation (e.g. object storage) without any caller change.

`FILE_SYSTEM_ROOT_FOLDER` is a **mount point** — use a persistent POSIX volume
(local, NFS, EFS), **shared** across replicas if you run more than one. Avoid
S3-via-FUSE. In containers, mount a volume (`local-data` is otherwise ephemeral).
