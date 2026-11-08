import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgBoss } from './pg-boss';
import { DbConfig } from '../config/db.config';
import { JobContext } from './job-context';
import { JobRegistry } from './job-registry';
import { BOSS_POOL_SIZE, BOSS_SCHEMA, PG_BOSS } from './jobs.constants';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsWorker } from './jobs.worker';

/**
 * Long-running jobs, on pg-boss (its own `pgboss` schema, installed and
 * migrated on start). Global so features (and DesignService, for design
 * changes) inject `JobsService`, `JobRegistry` and `JobContext`; it imports no
 * feature module, so there are no cycles.
 */
@Global()
@Module({
  controllers: [JobsController],
  providers: [
    {
      provide: PG_BOSS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.getOrThrow<DbConfig>('db');
        return new PgBoss({
          host: db.host,
          port: db.port,
          user: db.username,
          password: db.password,
          database: db.database,
          ssl: db.ssl ? { rejectUnauthorized: false } : false,
          schema: BOSS_SCHEMA,
          max: BOSS_POOL_SIZE,
        });
      },
    },
    JobContext,
    JobRegistry,
    JobsService,
    JobsWorker,
  ],
  exports: [JobsService, JobRegistry, JobContext],
})
export class JobsModule {}
