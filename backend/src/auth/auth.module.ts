import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { LoginIssuer } from './login-issuer';
import { RolesGuard } from './roles.guard';
import { TokenService } from './token.service';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    TokenService,
    LoginIssuer,
    // Order matters: JwtAuthGuard first (sets req.user), then RolesGuard.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [TokenService, LoginIssuer],
})
export class AuthModule {}
