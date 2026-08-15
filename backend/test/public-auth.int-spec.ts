import { INestApplication } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { seedUser, startTestApp, TestApp, TEST_JWT_SECRET } from './harness';

const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const RESET_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ADMIN_EMAIL = 'ada@acme.com';
const RESET_EMAIL = 'reset@acme.com';
const OLD_PASSWORD = 'old password here';

/** Mint a reset JWT the way TokenService.generatePasswordResetToken does.
 *  `expiresInSeconds` may be negative to forge an already-expired token. */
const resetToken = (email: string, expiresInSeconds: number) =>
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
      const res = await request(server())
        .post('/user/reset_password')
        .send({
          refreshToken: resetToken(RESET_EMAIL, 3600),
          newPassword: NEW_PASSWORD,
        })
        .expect(200);
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

    it('rejects an expired reset token with 401', () =>
      request(server())
        .post('/user/reset_password')
        .send({
          refreshToken: resetToken(ADMIN_EMAIL, -10),
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
