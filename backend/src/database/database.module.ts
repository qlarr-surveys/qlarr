import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DbConfig } from '../config/db.config';
import { DbContext } from './db-context';
import { MIGRATIONS } from './migrations';

/**
 * Root TypeORM connection to the Postgres database.
 *
 * `synchronize: false` is non-negotiable — migrations own the schema;
 * TypeORM must never alter it. The baseline migration is applied on startup
 * (`migrationsRun`), materializing the schema in a fresh database.
 *
 * `@Global()` so `DbContext` — the `EntityManager` seam — is injectable from
 * any feature module without importing this module explicitly.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.getOrThrow<DbConfig>('db');
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          // Connect over TLS when the server requires it (e.g. managed
          // Postgres); verification is relaxed so a CA outside the container's
          // trust store still connects — the connection is still encrypted.
          ssl: db.ssl ? { rejectUnauthorized: false } : false,
          synchronize: false,
          autoLoadEntities: true,
          entities: [],
          migrations: MIGRATIONS,
          migrationsRun: true,
        };
      },
    }),
  ],
  providers: [DbContext],
  exports: [DbContext],
})
export class DatabaseModule {}
