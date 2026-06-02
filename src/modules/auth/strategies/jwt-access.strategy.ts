import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { FastifyRequest } from 'fastify';
import { AccessContextService } from '../../../common/services/access-context.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessContextService: AccessContextService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: FastifyRequest) => req?.cookies?.['accessToken'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'access-secret',
    });
  }

  async validate(payload: { sub: string; role: string }) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User is inactive or no longer exists');
    }

    await this.accessContextService.ensureWorkspaceAccessOrThrow(
      user.id,
      user.role,
    );

    return user;
  }
}
