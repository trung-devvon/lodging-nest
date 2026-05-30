import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { FastifyRequest } from 'fastify';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: FastifyRequest) => req?.cookies?.['refreshToken'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
    });
  }

  async validate(payload: { sub: string; role: string }) {
    return { id: payload.sub, role: payload.role };
  }
}
