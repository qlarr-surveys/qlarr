import {
  envValidationOptions,
  envValidationSchema,
} from '../src/config/env.validation';

// A minimal environment that satisfies every required var.
const validEnv = {
  FRONTEND_URL: 'http://localhost:3000',
  DB_HOST: 'localhost',
  DB_USER: 'qlarr',
  DB_PASSWORD: 'secret',
  DB_NAME: 'qlarr',
  JWT_SECRET: 'lGYGGQSGHvq1lIw6Y3Ipy06H8SpSgHcARdPztZAS7Ug=',
};

const validate = (env: Record<string, unknown>) =>
  envValidationSchema.validate(env, envValidationOptions);

describe('env validation schema', () => {
  it('accepts a complete environment', () => {
    expect(validate(validEnv).error).toBeUndefined();
  });

  it('applies safe defaults for absent tunables (no NaN)', () => {
    const { error, value } = validate(validEnv);
    expect(error).toBeUndefined();
    expect(value.DB_PORT).toBe(5432);
    expect(value.FILE_SYSTEM_ROOT_FOLDER).toBe('local-data');
    expect(value.JWT_ACTIVE_EXPIRATION_MS).toBe(3_600_000);
    expect(value.DB_SSL).toBe(false);
  });

  it.each([
    'FRONTEND_URL',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
  ])('rejects a missing required var: %s', (key) => {
    const env: Record<string, unknown> = { ...validEnv };
    delete env[key];
    const { error } = validate(env);
    expect(error).toBeDefined();
    expect(error!.message).toContain(key);
  });

  it('reports every problem at once (abortEarly: false)', () => {
    const { error } = validate({ JWT_SECRET: validEnv.JWT_SECRET });
    expect(error).toBeDefined();
    // All five other required vars are missing → all five surface together.
    expect(error!.details.length).toBe(5);
  });

  it('rejects a non-numeric port', () => {
    const { error } = validate({ ...validEnv, DB_PORT: 'not-a-number' });
    expect(error).toBeDefined();
    expect(error!.message).toContain('DB_PORT');
  });

  it('rejects a too-short JWT secret', () => {
    const { error } = validate({ ...validEnv, JWT_SECRET: 'short' });
    expect(error).toBeDefined();
    expect(error!.message).toContain('JWT_SECRET');
  });

  it('rejects a non-UTC timezone', () => {
    const { error } = validate({ ...validEnv, TZ: 'America/New_York' });
    expect(error).toBeDefined();
    expect(error!.message).toContain('TZ');
  });

  it('defaults an absent TZ to UTC', () => {
    expect(validate(validEnv).value.TZ).toBe('UTC');
  });

  it('leaves unrelated env vars alone (allowUnknown)', () => {
    const { error } = validate({ ...validEnv, PATH: '/usr/bin', TZ: 'UTC' });
    expect(error).toBeUndefined();
  });
});
