// Re-enable the auth-route rate limiting that setup-env turns off for the other
// suites (which reuse one email across many logins). Set before AppModule loads
// so ThrottlerModule's skipIf sees it. See IdentityThrottlerGuard.
process.env.THROTTLE_DISABLED = 'false';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { bearer, seedUser, startTestApp, TestApp } from './harness';

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMAIL = 'ada@acme.com';
const PASSWORD = 'correct horse battery';

// Login limit is 10 / 5 min, PIN-confirm 5 / 15 min (see the controllers).
const LOGIN_LIMIT = 10;
const PIN_LIMIT = 5;

const BEARER = bearer({ userId: USER_ID, email: EMAIL });

describe('Auth-route rate limiting (identity-keyed)', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await startTestApp();
    app = ctx.app;
    root = ctx.root;
    await seedUser(root, {
      id: USER_ID,
      email: EMAIL,
      password: PASSWORD,
      firstName: 'Ada',
      lastName: 'Acme',
      roles: ['SUPER_ADMIN'],
    });
    // A pending email change so confirm_new_email reaches the PIN check (a wrong
    // PIN → 400) rather than short-circuiting — proving the guard counts attempts.
    await root.query(
      `INSERT INTO email_changes (user_id, new_email, pin)
       VALUES ($1,'next@acme.com','000000')`,
      [USER_ID],
    );
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const server = () => app.getHttpServer();

  describe('POST /user/login', () => {
    it(`allows ${LOGIN_LIMIT} attempts per email then 429s the next`, async () => {
      for (let i = 0; i < LOGIN_LIMIT; i++) {
        await request(server())
          .post('/user/login')
          .send({ email: EMAIL, password: PASSWORD })
          .expect(200);
      }
      // The (limit+1)th within the window is rejected by the throttler.
      await request(server())
        .post('/user/login')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(429);
    });

    it('keeps a separate bucket per email (a different email is unaffected)', () =>
      // Even after EMAIL is throttled above, an unrelated email still gets its
      // normal 401 — proving the limit is per-identity, not global.
      request(server())
        .post('/user/login')
        .send({ email: 'someone-else@acme.com', password: 'whatever' })
        .expect(401));
  });

  describe('POST /user/confirm_new_email', () => {
    it(`allows ${PIN_LIMIT} PIN attempts per user then 429s the next`, async () => {
      for (let i = 0; i < PIN_LIMIT; i++) {
        await request(server())
          .post('/user/confirm_new_email')
          .set('Authorization', BEARER)
          .send({ pin: '999999' }) // wrong PIN → 400 (WrongEmailChangePinException)
          .expect(400);
      }
      await request(server())
        .post('/user/confirm_new_email')
        .set('Authorization', BEARER)
        .send({ pin: '999999' })
        .expect(429);
    });
  });
});
