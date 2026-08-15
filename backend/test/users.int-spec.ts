import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { bearer, seedUser, startTestApp, TestApp } from './harness';

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

/**
 * The request path end to end against a real Postgres: a minted token → the
 * global JWT guard → a real domain query.
 */
describe('GET /users/me', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  const token = () => bearer({ userId: USER_ID, email: 'ada@acme.com' });

  beforeAll(async () => {
    ctx = await startTestApp();
    app = ctx.app;
    root = ctx.root;
    await seedUser(root, {
      id: USER_ID,
      email: 'ada@acme.com',
      password: 'secret',
      firstName: 'Ada',
      lastName: 'Acme',
    });
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  it('returns the current user (no password)', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', token())
      .expect(200);

    expect(res.body.email).toBe('ada@acme.com');
    expect(res.body.firstName).toBe('Ada');
    expect(res.body.password).toBeUndefined();
  });

  it('rejects an unauthenticated request', () =>
    request(app.getHttpServer()).get('/users/me').expect(401));

  // ParseUUIDPipe rejects a non-UUID :userId with 400 before it reaches the
  // `uuid` column (which would otherwise be a Postgres 22P02 → unhandled 500).
  it('returns 400 (not 500) for a non-UUID user id', () =>
    request(app.getHttpServer())
      .get('/user/not-a-uuid')
      .set('Authorization', token())
      .expect(400));
});
