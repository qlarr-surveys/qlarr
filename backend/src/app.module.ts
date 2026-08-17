import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { MAX_UPLOAD_BYTES } from './common/upload';
import appConfig from './config/app.config';
import dbConfig from './config/db.config';
import engineConfig from './config/engine.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import storageConfig from './config/storage.config';
import { envValidationOptions, envValidationSchema } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { EngineModule } from './engine/engine.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './modules/users/users.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { ResponsesModule } from './modules/responses/responses.module';
import { DesignModule } from './modules/design/design.module';
import { RunModule } from './modules/run/run.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Fail fast at boot on a missing/mistyped required var (see env.validation).
      validationSchema: envValidationSchema,
      validationOptions: envValidationOptions,
      load: [
        appConfig,
        dbConfig,
        engineConfig,
        jwtConfig,
        mailConfig,
        storageConfig,
      ],
    }),
    // In-memory rate-limit store for the sensitive auth routes (login /
    // forgot-password / email-change PIN). The per-route limits are declared with
    // @Throttle on those handlers and keyed by identity via IdentityThrottlerGuard;
    // this default is only a fallback. Per-process store — good enough as a
    // brute-force brake; a shared (Redis) store would be needed for cross-instance
    // limits. `skipIf` lets test suites that reuse one email across many logins
    // opt out (THROTTLE_DISABLED=true); it is never set in prod, so throttling is
    // on by default.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 30 }],
      skipIf: () => process.env.THROTTLE_DISABLED === 'true',
    }),
    // Flat 100MB cap on every multipart upload; bounds per-request memory globally
    // so no FileInterceptor reads an unbounded body into the heap.
    MulterModule.register({ limits: { fileSize: MAX_UPLOAD_BYTES } }),
    EngineModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    SurveysModule,
    ResponsesModule,
    DesignModule,
    RunModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Registered via DI (not `app.useGlobalPipes`) so it applies in tests that
    // bootstrap AppModule directly, identically to production. Only bodies typed
    // as a validation-decorated class are checked; interface/`Record` bodies
    // (engine/design/response payloads) pass through untouched. `whitelist`
    // strips unknown properties.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
  ],
})
export class AppModule {}
