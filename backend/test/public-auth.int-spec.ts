import { INestApplication } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EmailService } from '../src/integrations/email/email.service';
import { seedUser, startTestApp, TestApp, TEST_JWT_SECRET } from './harness';

const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const RESET_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ADMIN_EMAIL = 'ada@acme.com';
const RESET_EMAIL = 'reset@acme.com';
const OLD_PASSWORD = 'old password here';

/** Mint a reset JWT without the password fingerprint (as links sent before
 *  single-use tokens were). `expiresInSeconds` may be negative to forge an
 *  already-expired token. */
const legacyResetToken = (email: string, expiresInSeconds: number) =>
  jwt.sign(
    { reset_password: true },
    Buffer.from(TEST_JWT_SECRET, 'base64'),
    { algorithm: 'HS256', subject: email, expiresIn: expiresInSeconds },
  );

describe('Public auth flows (forgot / reset)', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await startTestApp();
    app = ctx.app;
    root = ctx.root;
    await seedUser(root, {
      id: ADMIN_ID,
      email: ADMIN_EMAIL,
      password: OLD_PASSWORD,
      firstName: 'Ada',
      lastName: 'Acme',
      roles: ['SUPER_ADMIN'],
    });
    await seedUser(root, {
      id: RESET_ID,
      email: RESET_EMAIL,
      password: OLD_PASSWORD,
      firstName: 'Rex',
      lastName: 'Reset',
      roles: ['SURVEY_ADMIN'],
      confirmed: false,
    });
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const server = () => app.getHttpServer();

  /** Requests a forgot-password email and returns the token from its link. */
  const forgotPasswordToken = async (email: string): Promise<string> => {
    const send = jest.spyOn(app.get(EmailService), 'sendEmail');
    try {
      await request(server())
        .post('/user/forgot_password')
        .send({ email })
        .expect(204);
      expect(send).toHaveBeenCalledTimes(1);
      return /token=(\S+)/.exec(send.mock.calls[0][2])![1];
    } finally {
      send.mockRestore();
    }
  };

  const reset = (token: string, newPassword: string) =>
    request(server())
      .post('/user/reset_password')
      .send({ refreshToken: token, newPassword });

  describe('POST /user/forgot_password', () => {
    it('returns 204 for a known email', () =>
      request(server())
        .post('/user/forgot_password')
        .send({ email: ADMIN_EMAIL })
        .expect(204));

    it('returns 204 for an unknown email (no account enumeration)', () =>
      request(server())
        .post('/user/forgot_password')
        .send({ email: 'ghost@nowhere.com' })
        .expect(204));

    it('rejects a malformed body with 400', () =>
      request(server()).post('/user/forgot_password').send({}).expect(400));
  });

  describe('POST /user/reset_password', () => {
    it('sets a new password with a valid reset token and logs in', async () => {
      const NEW_PASSWORD = 'brand new password';
      const res = await reset(
        await forgotPasswordToken(RESET_EMAIL),
        NEW_PASSWORD,
      ).expect(200);
      expect(res.body.email).toBe(RESET_EMAIL);
      expect(typeof res.body.accessToken).toBe('string');

      // The new password now works via login…
      await request(server())
        .post('/user/login')
        .send({ email: RESET_EMAIL, password: NEW_PASSWORD })
        .expect(200);
      // …and reset marks the account confirmed.
      const rows = await root.query(
        `SELECT is_confirmed FROM users WHERE id = $1`,
        [RESET_ID],
      );
      expect(rows[0].is_confirmed).toBe(true);
    });

    it('rejects a reset link the second time it is used', async () => {
      const token = await forgotPasswordToken(ADMIN_EMAIL);
      await reset(token, 'first new password').expect(200);
      await reset(token, 'second new password').expect(401);

      // The first reset stands.
      await request(server())
        .post('/user/login')
        .send({ email: ADMIN_EMAIL, password: 'first new password' })
        .expect(200);
    });

    it('voids every outstanding reset link once any one of them is used', async () => {
      const first = await forgotPasswordToken(ADMIN_EMAIL);
      const second = await forgotPasswordToken(ADMIN_EMAIL);
      await reset(second, 'newest password').expect(200);
      await reset(first, 'stale link password').expect(401);
    });

    it('rejects a reset link issued before the password changed elsewhere', async () => {
      const token = await forgotPasswordToken(ADMIN_EMAIL);
      // Password changed through another link before this one is used.
      await reset(await forgotPasswordToken(ADMIN_EMAIL), 'changed meanwhile').expect(
        200,
      );
      await reset(token, 'too late').expect(401);
    });

    it('rejects a link without the password fingerprint (sent before this change)', () =>
      reset(legacyResetToken(ADMIN_EMAIL, 3600), 'whatever').expect(401));

    it('logs out every other session of the user', async () => {
      const login = await request(server())
        .post('/user/login')
        .send({ email: ADMIN_EMAIL, password: 'changed meanwhile' })
        .expect(200);
      const before = await root.query(
        `SELECT id FROM refresh_tokens WHERE user_id = $1`,
        [ADMIN_ID],
      );
      expect(before.map((r: { id: string }) => r.id)).toContain(
        login.body.refreshToken,
      );

      const res = await reset(
        await forgotPasswordToken(ADMIN_EMAIL),
        'final password',
      ).expect(200);

      // Only the session the reset itself just opened is left.
      const after = await root.query(
        `SELECT id FROM refresh_tokens WHERE user_id = $1`,
        [ADMIN_ID],
      );
      expect(after.map((r: { id: string }) => r.id)).toEqual([
        res.body.refreshToken,
      ]);
    });

    it('rejects an expired reset token with 401', () =>
      request(server())
        .post('/user/reset_password')
        .send({
          refreshToken: legacyResetToken(ADMIN_EMAIL, -10),
          newPassword: 'whatever',
        })
        .expect(401));

    it('rejects a forged reset token with 401', () =>
      request(server())
        .post('/user/reset_password')
        .send({ refreshToken: 'not.a.jwt', newPassword: 'whatever' })
        .expect(401));

    it('rejects a malformed body with 400', () =>
      request(server()).post('/user/reset_password').send({}).expect(400));
  });
});
