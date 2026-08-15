import { INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import jwtConfig from '../src/config/jwt.config';

// Local-profile secret from backend-enterprise application.yaml. BASE64 —
// decoded to the HS256 HMAC key, exactly as the legacy JwtService did.
const SECRET = 'lGYGGQSGHvq1lIw6Y3Ipy06H8SpSgHcARdPztZAS7Ug=';

// Root module for the test: config + auth only, no DB. This is what lets the
// JWT layer be exercised end-to-end without a Postgres.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [jwtConfig] }),
    AuthModule,
  ],
})
class TestAppModule {}

describe('JWT auth — Kotlin token compatibility', () => {
  let app: INestApplication;
  const key = Buffer.from(SECRET, 'base64');

  // A token shaped exactly like the legacy backend mints.
  const kotlinToken = jwt.sign(
    {
      user_id: 'user-123',
      authorities: ['super_admin'],
      tenant_id: 'tenant-abc',
      session_id: 'sess-9',
    },
    key,
    { algorithm: 'HS256', subject: 'me@qlarr.com', expiresIn: '1h' },
  );

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRET;
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a Kotlin-shaped token and decodes its claims into the principal', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${kotlinToken}`)
      .expect(200);

    expect(res.body).toEqual({
      userId: 'user-123',
      email: 'me@qlarr.com',
      authorities: ['super_admin'],
      sessionId: 'sess-9',
    });
  });

  it('rejects a request with no token (401)', () =>
    request(app.getHttpServer()).get('/auth/me').expect(401));

  it('rejects a tampered token (401)', () =>
    request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${kotlinToken}corrupt`)
      .expect(401));

  it('rejects a token signed with a different secret (401)', () => {
    const forged = jwt.sign(
      { user_id: 'x', tenant_id: 'y' },
      Buffer.from('AAAAAAAAAAAAAAAAAAAAAA==', 'base64'),
      { algorithm: 'HS256' },
    );
    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
  });
});
