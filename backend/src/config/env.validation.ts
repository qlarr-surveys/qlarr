import * as Joi from 'joi';

/**
 * Boot-time environment gate, passed to `ConfigModule.forRoot` as
 * `validationSchema`. A missing or mistyped required var now crashes at startup
 * with a clear message, instead of surfacing later as `undefined` / `NaN` deep
 * inside a request (a missing `parseInt` var becomes `NaN`, which propagates
 * silently). `@nestjs/config` writes validated defaults back to `process.env`,
 * which the `registerAs` factories read — so a `.default()` here both documents
 * the fallback and prevents the `NaN`.
 *
 * Optionality mirrors what the config factories / services already tolerate:
 *  - required: secrets + connection identity (no safe default exists)
 *  - defaulted: operational tunables with a universal safe value
 *  - optional: integrations that degrade gracefully (mail → logs)
 */
const bool = Joi.boolean().truthy('true').falsy('false');

export const envValidationSchema = Joi.object({
  // --- required: no safe default ---
  FRONTEND_URL: Joi.string().uri().required(),
  DB_HOST: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),

  // Initial-admin password (the admin is always seeded on an empty DB).
  SEED_ADMIN_PASSWORD: Joi.string().default('admin'),

  // --- tunables with a universal safe default (also prevents NaN) ---
  // The datetime layer stores zone-less UTC wall clocks and node-postgres parses
  // timestamps in the process TZ — a non-UTC process silently shifts every date,
  // so reject anything but UTC at boot (unset → UTC).
  TZ: Joi.string().valid('UTC', 'Etc/UTC').default('UTC'),
  PORT: Joi.number().port().default(8080),
  DB_PORT: Joi.number().port().default(5432),
  DB_SSL: bool.default(false),
  JWT_ACTIVE_EXPIRATION_MS: Joi.number().positive().default(3_600_000), // 1h
  JWT_REFRESH_EXPIRATION_MS: Joi.number().positive().default(2_592_000_000), // 30d
  JWT_RESET_EXPIRATION_MS: Joi.number().positive().default(3_600_000), // 1h
  JWT_RESET_EXPIRATION_NEW_USERS_MS: Joi.number()
    .positive()
    .default(604_800_000), // 7d

  // --- local file storage ---
  FILE_SYSTEM_ROOT_FOLDER: Joi.string().default('local-data'),

  // --- optional integrations (degrade gracefully) ---
  MAIL_HOST: Joi.string().allow('').optional(),
  MAIL_PORT: Joi.number().default(1025),
  MAIL_USERNAME: Joi.string().allow('').optional(),
  MAIL_PASSWORD: Joi.string().allow('').optional(),
  MAIL_NAME: Joi.string().allow('').optional(),
  MAIL_SMTP_SSL: bool.default(false),
  MAIL_SMTP_STARTTLS: bool.default(false),

  // --- engine worker pool (engine.config already defaults these) ---
  ENGINE_WORKERS: bool.optional(),
  ENGINE_POOL_SIZE: Joi.number().integer().positive().optional(),
  ENGINE_TIMEOUT_MS: Joi.number().integer().positive().optional(),
  ENGINE_MAX_OLD_GEN_MB: Joi.number().integer().positive().optional(),
});

/**
 * `abortEarly: false` reports every problem at once (not one restart at a time);
 * `allowUnknown: true` leaves unrelated env vars (PATH, NODE_ENV, TZ, …) alone.
 */
export const envValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
};
