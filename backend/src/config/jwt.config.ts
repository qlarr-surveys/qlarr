import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  /** BASE64-encoded secret. Decoded to raw bytes for the HS256 HMAC key. */
  secret: string;
  activeExpirationMs: number;
  resetExpirationMs: number;
  resetExpirationForNewUsersMs: number;
  refreshExpirationMs: number;
}

/** All values come from the environment — see backend/.env. */
export default registerAs(
  'jwt',
  (): JwtConfig => ({
    secret: process.env.JWT_SECRET!,
    activeExpirationMs: parseInt(process.env.JWT_ACTIVE_EXPIRATION_MS!, 10),
    resetExpirationMs: parseInt(process.env.JWT_RESET_EXPIRATION_MS!, 10),
    resetExpirationForNewUsersMs: parseInt(
      process.env.JWT_RESET_EXPIRATION_NEW_USERS_MS!,
      10,
    ),
    refreshExpirationMs: parseInt(process.env.JWT_REFRESH_EXPIRATION_MS!, 10),
  }),
);
