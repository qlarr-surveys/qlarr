import { registerAs } from '@nestjs/config';

export interface DbConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  /** Connect over TLS. Required by RDS (`rds.force_ssl`); off for a plain
   *  local Postgres that has no server certificate. */
  ssl: boolean;
}

/**
 * Connection to the existing Postgres. Env names use DB_USER / DB_PASSWORD;
 * host/port/name are split out for the `pg` driver.
 * All values come from the environment — see backend/.env.
 */
export default registerAs(
  'db',
  (): DbConfig => ({
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!, 10),
    username: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl: process.env.DB_SSL === 'true',
  }),
);
