import { Global, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import engineConfig from '../config/engine.config';
import { ENGINE_JOB_POOL } from './engine.constants';
import { EnginePool } from './engine.pool';
import { EngineService } from './engine.service';

/**
 * The survey-engine binding. Global because many modules (design, run,
 * responses, surveys) call it — like the engine's `SurveyProcessor` object.
 * {@link EnginePool} isolates the author-JS-executing ops on worker threads.
 * Jobs get a second pool with no per-call timeout: a job is ended by its time
 * limit or a cancel, which terminate the worker running it. Its workers run at
 * the lowest OS priority, so jobs never take CPU from respondents.
 */
@Global()
@Module({
  providers: [
    {
      provide: EnginePool,
      useFactory: (config: ConfigType<typeof engineConfig>) =>
        new EnginePool({
          workersEnabled: config.workersEnabled,
          poolSize: config.poolSize,
          timeoutMs: config.timeoutMs,
          maxOldGenerationSizeMb: config.maxOldGenerationSizeMb,
        }),
      inject: [engineConfig.KEY],
    },
    {
      provide: ENGINE_JOB_POOL,
      useFactory: (config: ConfigType<typeof engineConfig>) =>
        new EnginePool({
          workersEnabled: config.workersEnabled,
          poolSize: config.jobPoolSize,
          timeoutMs: 0,
          maxOldGenerationSizeMb: config.maxOldGenerationSizeMb,
          lowPriority: true,
        }),
      inject: [engineConfig.KEY],
    },
    EngineService,
  ],
  exports: [EngineService],
})
export class EngineModule {}
