import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig } from '../config/jwt.config';
import { CurrentUserPrincipal, JwtPayload } from './jwt.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const jwt = config.getOrThrow<JwtConfig>('jwt');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // The HMAC key is the BASE64-DECODED secret bytes.
      secretOrKey: Buffer.from(jwt.secret, 'base64'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload): CurrentUserPrincipal {
    if (!payload.user_id) {
      throw new UnauthorizedException('Malformed token');
    }
    return {
      userId: payload.user_id,
      email: payload.sub,
      authorities: payload.authorities ?? [],
      sessionId: payload.session_id,
    };
  }
}
