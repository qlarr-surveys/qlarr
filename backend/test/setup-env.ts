// Baseline env for tests that bootstrap AppModule — whose ConfigModule.forRoot
// validates the environment when app.module is imported. The harness overrides
// DB_*/JWT_SECRET with its Postgres testcontainer before app.init(); these
// placeholders just satisfy the import-time validation. `??=` so a suite can
// still override.
process.env.FRONTEND_URL ??= 'http://localhost:3000';
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5432';
process.env.DB_USER ??= 'test';
process.env.DB_PASSWORD ??= 'test';
process.env.DB_NAME ??= 'test';
process.env.JWT_SECRET ??= 'dGVzdC1zZWNyZXQtMTYtYnl0ZXMtbWluaW11bQ==';
// Auth-route rate limiting off by default in tests — existing suites reuse one
// email across many logins and would otherwise 429. The dedicated throttle spec
// re-enables it (sets THROTTLE_DISABLED=false before booting). `??=` so a suite
// can override.
process.env.THROTTLE_DISABLED ??= 'true';
// Engine workers off in tests — ts-jest runs from `src`, where only the `.ts`
// worker exists, so Piscina can't resolve `engine.worker.js`. Set here (before
// ConfigModule's dotenv load, which won't override an already-set var) so a
// committed `.env` with ENGINE_WORKERS=true doesn't force the pool on. `??=` so
// a suite can still override.
process.env.ENGINE_WORKERS ??= 'false';
