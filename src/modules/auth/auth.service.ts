import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly accessTokenSecret: string;
  private readonly maxFailedAttempts = 5;
  private readonly lockoutMinutes = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET ?? 'access-secret';
  }

  async register(dto: RegisterDto, ipAddress?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existingOrg) {
      throw new ConflictException('Organization slug already exists');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          phone: dto.phone,
          role: 'ORG_OWNER',
        },
      });

      await tx.organization.create({
        data: {
          ownerId: newUser.id,
          name: dto.name,
          slug: dto.slug,
          businessType: (dto.businessType as any) ?? 'HOMESTAY',
          taxCode: dto.taxCode,
          status: 'PENDING_APPROVAL',
        },
      });

      const defaultPlan = await tx.subscriptionPlan.findUnique({
        where: { name: 'LU_HANH' },
      });
      if (!defaultPlan) {
        throw new BadRequestException('Default subscription plan not found. Run seed first.');
      }

      await tx.subscription.create({
        data: {
          organizationId: newUser.id,
          planId: defaultPlan.id,
          status: 'TRIALING',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return newUser;
    });

    const tokens = await this.generateTokens(user.id, user.role, ipAddress);
    return { user, ...tokens };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account locked. Try again in ${remaining} minute(s)`,
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      const failedCount = user.failedLoginCount + 1;
      const updateData: any = { failedLoginCount: failedCount };

      if (failedCount >= this.maxFailedAttempts) {
        updateData.lockedUntil = new Date(
          Date.now() + this.lockoutMinutes * 60 * 1000,
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      const remainingAttempts = this.maxFailedAttempts - failedCount;
      const message =
        remainingAttempts > 0
          ? `Invalid email or password. ${remainingAttempts} attempt(s) remaining`
          : 'Account locked due to too many failed attempts. Try again later.';

      throw new UnauthorizedException(message);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.role, ipAddress);
    return { user, ...tokens };
  }

  async refresh(refreshToken: string, ipAddress?: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.role,
      ipAddress,
    );
    return { user: storedToken.user, ...tokens };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = createHash('sha256')
      .update(resetToken)
      .digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash,
        resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return {
      message: 'If the email exists, a reset link has been sent',
      resetToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const currentPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!currentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(
    userId: string,
    role: string,
    ipAddress?: string,
  ) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, role },
      {
        secret: this.accessTokenSecret,
        expiresIn: '15m',
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
