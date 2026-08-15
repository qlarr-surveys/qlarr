import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { Role } from '../src/auth/role.enum';
import { Roles } from '../src/auth/roles.decorator';
import jwtConfig from '../src/config/jwt.config';

const SECRET = 'lGYGGQSGHvq1lIw6Y3Ipy06H8SpSgHcARdPztZAS7Ug=';

@Controller('secured')
class SecuredController {
  @Get('admins')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  admins() {
    return { ok: true };
  }

  @Get('any') // authenticated but no role requirement
  any() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [jwtConfig] }),
    AuthModule,
  ],
  controllers: [SecuredController],
})
class TestAppModule {}

describe('RolesGuard (@Roles / hasAnyAuthority)', () => {
  let app: INestApplication;

  const tokenWith = (authorities: string[]) =>
    jwt.sign(
      { user_id: 'u1', authorities, tenant_id: 't1', session_id: 's1' },
      Buffer.from(SECRET, 'base64'),
      { algorithm: 'HS256', subject: 'u@x.com', expiresIn: '1h' },
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

  const get = (path: string, token?: string) => {
    const req = request(app.getHttpServer()).get(path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  it('allows a caller holding a required role (200)', () =>
    get('/secured/admins', tokenWith(['super_admin'])).expect(200));

  it('forbids a caller without any required role (403)', () =>
    get('/secured/admins', tokenWith(['surveyor'])).expect(403));

  it('still requires authentication before roles (401 with no token)', () =>
    get('/secured/admins').expect(401));

  it('leaves role-free routes open to any authenticated caller (200)', () =>
    get('/secured/any', tokenWith(['analyst'])).expect(200));
});
