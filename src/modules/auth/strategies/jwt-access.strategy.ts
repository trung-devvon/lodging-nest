import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { FastifyRequest } from 'fastify';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: FastifyRequest) => req?.cookies?.['accessToken'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'access-secret',
    });
  }

  async validate(payload: { sub: string; role: string }) {
    return { id: payload.sub, role: payload.role };
  }
}
