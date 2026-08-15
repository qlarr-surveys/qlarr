import { Global, Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import engineConfig from '../config/engine.config';
import { EnginePool } from './engine.pool';
import { EngineService } from './engine.service';

/**
 * The survey-engine binding. Global because many modules (design, run,
 * responses, surveys) call it — like the engine's `SurveyProcessor` object.
 * {@link EnginePool} isolates the author-JS-executing ops on worker threads.
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
    EngineService,
  ],
  exports: [EngineService],
})
export class EngineModule {}
