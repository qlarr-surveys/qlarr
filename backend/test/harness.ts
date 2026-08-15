import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { configureBodyParsers } from '../src/app-config';
import { AppModule } from '../src/app.module';

/** Fixed base64 HS256 secret so minted tokens verify across a suite. */
export const TEST_JWT_SECRET = 'lGYGGQSGHvq1lIw6Y3Ipy06H8SpSgHcARdPztZAS7Ug=';

/** A default admin user id used by specs that don't seed a specific user. */
export const ADMIN_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

/** Mint an `Authorization: Bearer <jwt>` header (single-tenant claims). */
export function bearer(
  opts: {
    userId?: string;
    authorities?: string[];
    email?: string;
    sessionId?: string;
  } = {},
): string {
  const token = jwt.sign(
    {
      user_id: opts.userId ?? ADMIN_USER_ID,
      authorities: opts.authorities ?? ['super_admin'],
      session_id: opts.sessionId ?? 's',
    },
    Buffer.from(TEST_JWT_SECRET, 'base64'),
    {
      algorithm: 'HS256',
      subject: opts.email ?? `${opts.userId ?? ADMIN_USER_ID}@x.com`,
      expiresIn: '1h',
    },
  );
  return `Bearer ${token}`;
}

export interface TestApp {
  app: INestApplication;
  /** Raw connection to the same database, for seeding rows and asserting state. */
  root: DataSource;
  container: StartedPostgreSqlContainer;
  /** Local storage root for this app (LocalFileHelper writes under here). */
  storageRoot: string;
  close: () => Promise<void>;
}

/**
 * Boot the app against a throwaway Postgres. DatabaseModule runs the baseline
 * migration on init (a single `public` schema), so there is no schema setup to
 * do here. The admin (admin@admin.admin) is always seeded on the empty DB, as in
 * production — specs that need a specific user seed their own alongside it.
 */
export async function startTestApp(
  opts: {
    /** Override providers (e.g. rebind FILE_HELPER) before the app compiles. */
    overrides?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
  } = {},
): Promise<TestApp> {
  const container = await new PostgreSqlContainer('postgres:15.1').start();
  // Isolated storage dir per app so LocalFileHelper writes never touch the repo.
  const storageRoot = mkdtempSync(join(tmpdir(), 'qlarr-test-'));

  process.env.DB_HOST = container.getHost();
  process.env.DB_PORT = String(container.getPort());
  process.env.DB_USER = container.getUsername();
  process.env.DB_PASSWORD = container.getPassword();
  process.env.DB_NAME = container.getDatabase();
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.FILE_SYSTEM_ROOT_FOLDER = storageRoot;

  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (opts.overrides) builder = opts.overrides(builder);
  const moduleRef = await builder.compile();
  // Mirror production bootstrap (main.ts): disable the default 100kb body parser
  // and re-register it with a generous limit so large design payloads pass.
  const app = moduleRef.createNestApplication({ bodyParser: false });
  configureBodyParsers(app);
  await app.init();

  const root = new DataSource({
    type: 'postgres',
    url: container.getConnectionUri(),
  });
  await root.initialize();

  return {
    app,
    root,
    container,
    storageRoot,
    close: async () => {
      await app?.close();
      await root?.destroy();
      await container?.stop();
      rmSync(storageRoot, { recursive: true, force: true });
    },
  };
}

export interface SeedUser {
  id: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  /** DB (uppercase) role names, e.g. ['SUPER_ADMIN']. */
  roles?: string[];
  confirmed?: boolean;
}

/** Insert a user with a real bcrypt hash into the (single) `users` table. */
export async function seedUser(root: DataSource, u: SeedUser): Promise<void> {
  const hash = await bcrypt.hash(u.password, 10);
  await root.query(
    `INSERT INTO users
       (id, first_name, last_name, email, password, deleted, roles, is_confirmed)
     VALUES ($1,$2,$3,$4,$5,false,$6::varchar[],$7)`,
    [
      u.id,
      u.firstName ?? 'Test',
      u.lastName ?? 'User',
      u.email,
      hash,
      u.roles ?? ['SUPER_ADMIN'],
      u.confirmed ?? true,
    ],
  );
}
