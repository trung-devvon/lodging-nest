import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../common/services/email.service';
import { AccessContextService } from '../../common/services/access-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenSecret: string;
  private readonly emailVerificationTtlMs = 24 * 60 * 60 * 1000;
  private readonly maxFailedAttempts = 5;
  private readonly lockoutMinutes = 15;
  private readonly passwordResetTtlMs = 60 * 60 * 1000;
  private readonly revokeReasons = {
    rotated: 'ROTATED',
    logout: 'LOGOUT',
    reuseDetected: 'REUSE_DETECTED',
    inactiveUser: 'INACTIVE_USER',
    inactiveOrganization: 'INACTIVE_ORGANIZATION',
    passwordChanged: 'PASSWORD_CHANGED',
    passwordReset: 'PASSWORD_RESET',
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly accessContextService: AccessContextService,
  ) {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET ?? 'access-secret';
  }

  async register(dto: RegisterDto, ipAddress?: string, deviceInfo?: string) {
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
      const defaultPlan = await tx.subscriptionPlan.findUnique({
        where: { name: 'LU_HANH' },
      });
      if (!defaultPlan) {
        throw new BadRequestException(
          'Default subscription plan not found. Run seed first.',
        );
      }

      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          phone: dto.phone,
          role: 'ORG_OWNER',
        },
      });

      const organization = await tx.organization.create({
        data: {
          ownerId: newUser.id,
          name: dto.name,
          slug: dto.slug,
          businessType: (dto.businessType as any) ?? 'HOMESTAY',
          taxCode: dto.taxCode,
          status: 'ACTIVE_FREE_TRIAL',
        },
      });

      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: defaultPlan.id,
          status: 'TRIALING',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return newUser;
    });

    const tokens = await this.generateTokens(
      user.id,
      user.role,
      ipAddress,
      deviceInfo,
    );
    await this.issueEmailVerification(user.id, user.email, dto.name);
    return { user, ...tokens };
  }

  async login(dto: LoginDto, ipAddress?: string, deviceInfo?: string) {
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

    await this.assertWorkspaceAccessAllowed(user.id, user.role);

    const tokens = await this.generateTokens(
      user.id,
      user.role,
      ipAddress,
      deviceInfo,
    );
    return { user, ...tokens };
  }

  async refresh(refreshToken: string, ipAddress?: string, deviceInfo?: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (storedToken.revokedAt) {
      if (storedToken.revokedReason === this.revokeReasons.rotated) {
        await this.revokeRefreshTokenFamily(
          storedToken.userId,
          storedToken.familyId,
          this.revokeReasons.reuseDetected,
        );
      }

      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!storedToken.user.isActive || storedToken.user.deletedAt) {
      await this.revokeRefreshTokenFamily(
        storedToken.userId,
        storedToken.familyId,
        this.revokeReasons.inactiveUser,
      );
      throw new UnauthorizedException('User is inactive');
    }

    try {
      await this.assertWorkspaceAccessAllowed(
        storedToken.user.id,
        storedToken.user.role,
      );
    } catch (error) {
      await this.revokeRefreshTokenFamily(
        storedToken.userId,
        storedToken.familyId,
        this.revokeReasons.inactiveOrganization,
      );

      if (error instanceof ForbiddenException) {
        throw new UnauthorizedException('Organization is not active');
      }

      throw error;
    }

    const newRefreshToken = randomBytes(48).toString('hex');
    const newTokenHash = createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');

    const rotation = await this.prisma.$transaction(async (tx) => {
      const nextToken = await tx.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          familyId: storedToken.familyId,
          tokenHash: newTokenHash,
          deviceInfo,
          ipAddress,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const revoked = await tx.refreshToken.updateMany({
        where: { id: storedToken.id, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedReason: this.revokeReasons.rotated,
          replacedByTokenId: nextToken.id,
        },
      });

      return { nextToken, revokedCount: revoked.count };
    });

    if (rotation.revokedCount !== 1) {
      await this.revokeRefreshTokenFamily(
        storedToken.userId,
        storedToken.familyId,
        this.revokeReasons.reuseDetected,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: storedToken.user.id, role: storedToken.user.role },
      {
        secret: this.accessTokenSecret,
        expiresIn: '15m',
      },
    );

    return {
      user: storedToken.user,
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  private async assertWorkspaceAccessAllowed(userId: string, role: string) {
    try {
      await this.accessContextService.ensureWorkspaceAccessOrThrow(userId, role);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException('Organization is not active');
      }

      throw error;
    }
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: this.revokeReasons.logout,
      },
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
        resetTokenExpiresAt: new Date(Date.now() + this.passwordResetTtlMs),
      },
    });

    await this.sendResetPasswordEmail(user.email, resetToken);

    return {
      message: 'If the email exists, a reset link has been sent',
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerifyTokenHash: tokenHash,
        emailVerifyExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyTokenHash: null,
        emailVerifyExpiresAt: null,
      },
    });

    return {
      message: 'Email has been verified successfully',
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || user.isEmailVerified) {
      return {
        message: 'If the email exists, a verification link has been sent',
      };
    }

    const ownerOrganization = await this.prisma.organization.findFirst({
      where: { ownerId: user.id },
      select: { name: true },
    });

    await this.issueEmailVerification(
      user.id,
      user.email,
      ownerOrganization?.name ?? 'your account',
    );

    return {
      message: 'If the email exists, a verification link has been sent',
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

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: this.revokeReasons.passwordReset,
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

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: this.revokeReasons.passwordChanged,
      },
    });

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(
    userId: string,
    role: string,
    ipAddress?: string,
    deviceInfo?: string,
    familyId?: string,
  ) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, role },
      {
        secret: this.accessTokenSecret,
        expiresIn: '15m',
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId: familyId ?? randomUUID(),
        tokenHash,
        deviceInfo,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private async revokeRefreshTokenFamily(
    userId: string,
    familyId: string,
    reason: string,
  ) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  private async issueEmailVerification(
    userId: string,
    email: string,
    organizationName: string,
  ) {
    const verificationToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyTokenHash: tokenHash,
        emailVerifyExpiresAt: new Date(
          Date.now() + this.emailVerificationTtlMs,
        ),
      },
    });

    try {
      await this.emailService.sendVerificationEmail({
        email,
        organizationName,
        token: verificationToken,
      });
    } catch (error) {
      this.logger.warn(
        `Unable to send verification email to ${email}: ${this.formatError(error)}`,
      );
    }
  }

  private async sendResetPasswordEmail(email: string, resetToken: string) {
    try {
      await this.emailService.sendResetPasswordEmail({
        email,
        token: resetToken,
      });
    } catch (error) {
      this.logger.warn(
        `Unable to send password reset email to ${email}: ${this.formatError(error)}`,
      );
    }
  }

  private formatError(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
