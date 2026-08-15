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

From the repo root (npm workspaces):

```bash
npm install
npm run backend:dev          # watch mode on PORT (default 8080)
```

Or from this folder: `npm run start:dev`.

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
```

`test:int` / `test:e2e` require a running Docker daemon (Testcontainers throws
away a real Postgres per run — the only faithful coverage for the SQL-level
parts: native queries, JSONB, the response-index trigger).

## Storage

Files live under `FILE_SYSTEM_ROOT_FOLDER` (default `local-data`), one directory
per survey, with a `.metadata` sidecar per file (content type / etag / length).
The `FileHelper` interface is the swap seam: a different build can bind another
implementation (e.g. object storage) without any caller change.

`FILE_SYSTEM_ROOT_FOLDER` is a **mount point** — use a persistent POSIX volume
(local, NFS, EFS), **shared** across replicas if you run more than one. Avoid
S3-via-FUSE. In containers, mount a volume (`local-data` is otherwise ephemeral).
