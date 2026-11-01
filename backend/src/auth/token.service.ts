import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { formatWallClockUtc } from '../common/datetime';
import { JwtConfig } from '../config/jwt.config';

export interface IssuedAccessToken {
  sessionId: string;
  token: string;
  /** UTC wall clock ("yyyy-MM-dd HH:mm:ss") — matches the DB column. */
  refreshTokenExpiry: string;
}

/**
 * Issues access tokens: HS256 over the BASE64-decoded secret, `sub` = email,
 * lowercased roles.
 */
@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService) {}

  generateAccessToken(user: {
    id: string;
    email: string;
    roles: string[];
  }): IssuedAccessToken {
    const cfg = this.config.getOrThrow<JwtConfig>('jwt');
    const sessionId = randomUUID();
    const token = jwt.sign(
      {
        user_id: user.id,
        authorities: user.roles.map((r) => r.toLowerCase()),
        session_id: sessionId,
      },
      Buffer.from(cfg.secret, 'base64'),
      {
        algorithm: 'HS256',
        subject: user.email,
        expiresIn: Math.floor(cfg.activeExpirationMs / 1000),
      },
    );
    return {
      sessionId,
      token,
      refreshTokenExpiry: formatWallClockUtc(
        new Date(Date.now() + cfg.refreshExpirationMs),
      ),
    };
  }

  /**
   * Password-reset / new-user-invite token: claims `reset_password=true`,
   * subject = email, longer expiry for freshly-invited users. `pwd_fp` is a
   * fingerprint of the user's current password hash, so the token dies as soon
   * as the password changes — making it single-use.
   */
  generatePasswordResetToken(
    user: { email: string; password: string },
    newUser: boolean,
  ): string {
    const cfg = this.config.getOrThrow<JwtConfig>('jwt');
    const expMs = newUser
      ? cfg.resetExpirationForNewUsersMs
      : cfg.resetExpirationMs;
    return jwt.sign(
      { reset_password: true, pwd_fp: this.passwordFingerprint(user.password) },
      Buffer.from(cfg.secret, 'base64'),
      {
        algorithm: 'HS256',
        subject: user.email,
        expiresIn: Math.floor(expMs / 1000),
      },
    );
  }

  /**
   * Verifies a token's signature but ignores expiry, returning its identity
   * claims — for the refresh flow, where the access token is expected to be
   * expired but must still be genuine. Returns null on a bad signature.
   */
  decodeExpired(token: string): { userId: string } | null {
    try {
      const cfg = this.config.getOrThrow<JwtConfig>('jwt');
      const payload = jwt.verify(token, Buffer.from(cfg.secret, 'base64'), {
        algorithms: ['HS256'],
        ignoreExpiration: true,
      }) as { user_id?: string };
      if (!payload.user_id) {
        return null;
      }
      return { userId: payload.user_id };
    } catch {
      return null;
    }
  }

  /**
   * Fully validates a password-reset token (signature + expiry) and returns its
   * claims: an expired token is distinct from
   * a forged/malformed one so the caller can surface the right error.
   */
  decodeResetToken(token: string): ResetTokenResult {
    const cfg = this.config.getOrThrow<JwtConfig>('jwt');
    try {
      const payload = jwt.verify(token, Buffer.from(cfg.secret, 'base64'), {
        algorithms: ['HS256'],
      }) as { sub?: string; reset_password?: boolean; pwd_fp?: string };
      if (!payload.sub) {
        return { ok: false, expired: false };
      }
      return {
        ok: true,
        email: payload.sub,
        resetPassword: payload.reset_password === true,
        passwordFingerprint: payload.pwd_fp ?? '',
      };
    } catch (err) {
      return { ok: false, expired: err instanceof jwt.TokenExpiredError };
    }
  }

  /**
   * True when a reset token's fingerprint matches the user's current password
   * hash, i.e. the password hasn't changed since the token was issued.
   */
  resetTokenMatchesPassword(fingerprint: string, passwordHash: string): boolean {
    const expected = Buffer.from(this.passwordFingerprint(passwordHash));
    const actual = Buffer.from(fingerprint);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  /**
   * HMAC of the bcrypt hash, keyed with the JWT secret — JWT claims are readable
   * by anyone, so the hash itself must not go in.
   */
  private passwordFingerprint(passwordHash: string): string {
    const cfg = this.config.getOrThrow<JwtConfig>('jwt');
    return createHmac('sha256', Buffer.from(cfg.secret, 'base64'))
      .update(passwordHash)
      .digest('base64url')
      .slice(0, 22);
  }
}

export type ResetTokenResult =
  | {
      ok: true;
      email: string;
      resetPassword: boolean;
      passwordFingerprint: string;
    }
  | { ok: false; expired: boolean };
