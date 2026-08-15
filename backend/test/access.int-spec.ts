import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { seedUser, startTestApp, TestApp } from './harness';

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMAIL = 'ada@acme.com';
const PASSWORD = 'correct horse battery';

describe('POST /user/login (single-tenant → issue token)', () => {
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
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  it('logs in with correct credentials and returns a usable access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/user/login')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(200);

    expect(res.body.email).toBe(EMAIL);
    expect(res.body.firstName).toBe('Ada');
    // API contract is the lowercase @JsonProperty form (the Roles enum).
    expect(res.body.roles).toEqual(['super_admin']);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');

    // The issued token must work on a protected endpoint end to end.
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(200)
      .expect((r) => expect(r.body.email).toBe(EMAIL));

    // A refresh_tokens row was persisted in the tenant schema.
    const rows = await root.query(
      `SELECT id FROM refresh_tokens WHERE id = $1`,
      [res.body.refreshToken],
    );
    expect(rows).toHaveLength(1);
  });

  it('logs in with a mixed-case, space-padded email (normalized to the stored form)', async () => {
    const res = await request(app.getHttpServer())
      .post('/user/login')
      .send({ email: `  ${EMAIL.toUpperCase()}  `, password: PASSWORD })
      .expect(200);
    expect(res.body.email).toBe(EMAIL);
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('rejects a wrong password with 401', () =>
    request(app.getHttpServer())
      .post('/user/login')
      .send({ email: EMAIL, password: 'nope' })
      .expect(401));

  it('rejects an unknown email with 401', () =>
    request(app.getHttpServer())
      .post('/user/login')
      .send({ email: 'ghost@nowhere.com', password: PASSWORD })
      .expect(401));

  it('rejects a malformed body with 400', () =>
    request(app.getHttpServer()).post('/user/login').send({}).expect(400));

  describe('POST /user/refresh_token', () => {
    const login = async () => {
      const res = await request(app.getHttpServer())
        .post('/user/login')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);
      return res.body as { accessToken: string; refreshToken: string };
    };

    it('issues a new access token and reuses the same refresh token', async () => {
      const { accessToken, refreshToken } = await login();

      const res = await request(app.getHttpServer())
        .post('/user/refresh_token')
        .send({ accessToken, refreshToken })
        .expect(200);

      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.refreshToken).toBe(refreshToken); // no rotation

      // the refreshed access token works on a protected endpoint
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(200);
    });

    it('rejects an unknown refresh token with 401', async () => {
      const { accessToken } = await login();
      await request(app.getHttpServer())
        .post('/user/refresh_token')
        .send({
          accessToken,
          refreshToken: '99999999-9999-9999-9999-999999999999',
        })
        .expect(401);
    });

    it('rejects a forged access token with 401', async () => {
      const { refreshToken } = await login();
      await request(app.getHttpServer())
        .post('/user/refresh_token')
        .send({ accessToken: 'not.a.jwt', refreshToken })
        .expect(401);
    });

    it('rejects a malformed body with 400', () =>
      request(app.getHttpServer())
        .post('/user/refresh_token')
        .send({})
        .expect(400));
  });

  describe('POST /logout', () => {
    const login = async () => {
      const res = await request(app.getHttpServer())
        .post('/user/login')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);
      return res.body as { accessToken: string; refreshToken: string };
    };

    const refreshRow = (id: string) =>
      root.query(`SELECT id FROM refresh_tokens WHERE id = $1`, [id]);

    it('invalidates the session refresh token and returns 200', async () => {
      const { accessToken, refreshToken } = await login();
      expect(await refreshRow(refreshToken)).toHaveLength(1);

      await request(app.getHttpServer())
        .post('/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // The refresh row is gone, so it can no longer mint a new access token.
      expect(await refreshRow(refreshToken)).toHaveLength(0);
      await request(app.getHttpServer())
        .post('/user/refresh_token')
        .send({ accessToken, refreshToken })
        .expect(401);
    });

    it('logs out everywhere — drops every session for the user', async () => {
      const first = await login();
      const second = await login();

      await request(app.getHttpServer())
        .post('/logout')
        .set('Authorization', `Bearer ${second.accessToken}`)
        .expect(200);

      // Not just the caller's session: both refresh tokens are gone.
      expect(await refreshRow(second.refreshToken)).toHaveLength(0);
      expect(await refreshRow(first.refreshToken)).toHaveLength(0);
    });

    it('is idempotent — a repeated logout still returns 200', async () => {
      const { accessToken } = await login();
      await request(app.getHttpServer())
        .post('/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .post('/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('rejects an unauthenticated request with 401', () =>
      request(app.getHttpServer()).post('/logout').expect(401));
  });
});
