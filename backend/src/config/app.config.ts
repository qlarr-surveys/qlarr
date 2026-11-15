import { registerAs } from '@nestjs/config';

export interface AppConfig {
  /** Public frontend base URL, used to build links in outbound emails
   *  (password reset). */
  frontendUrl: string;
  /** Public backend base URL (no trailing slash), used to repoint resource
   *  URLs embedded in an imported survey's design at this instance. */
  backendUrl: string;
  /** Password for the initial admin (admin@admin.admin), always seeded on first
   *  startup when the users table is empty. Defaults to "admin" — set
   *  SEED_ADMIN_PASSWORD to change it. */
  seedAdminPassword: string;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    frontendUrl: process.env.FRONTEND_URL!,
    backendUrl: process.env.BACKEND_URL!.replace(/\/+$/, ''),
    seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'admin',
  }),
);
