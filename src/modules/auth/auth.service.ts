import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
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

type VerifyEmailResult =
  | {
      message: string;
      user: {
        id: string;
        email: string;
        role: string;
        isEmailVerified: boolean;
      };
      accessToken: string;
      refreshToken: string;
    }
  | {
      message: string;
    };

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

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const slug = dto.slug.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existingOrg) {
      throw new ConflictException('Organization slug already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const pendingByEmail = await this.prisma.pendingOwnerRegistration.findUnique(
      {
        where: { email },
      },
    );
    const pendingBySlug = await this.prisma.pendingOwnerRegistration.findUnique({
      where: { slug },
    });

    if (pendingBySlug && pendingBySlug.email !== email) {
      throw new ConflictException('Organization slug already exists');
    }

    const tokenPayload = this.createVerificationTokenPayload();

    if (pendingByEmail) {
      await this.prisma.pendingOwnerRegistration.update({
        where: { id: pendingByEmail.id },
        data: {
          passwordHash,
          phone: dto.phone,
          name: dto.name,
          slug,
          businessType: (dto.businessType as any) ?? 'HOMESTAY',
          taxCode: dto.taxCode,
          verificationTokenHash: tokenPayload.tokenHash,
          verificationExpiresAt: tokenPayload.expiresAt,
        },
      });
    } else {
      await this.prisma.pendingOwnerRegistration.create({
        data: {
          email,
          passwordHash,
          phone: dto.phone,
          name: dto.name,
          slug,
          businessType: (dto.businessType as any) ?? 'HOMESTAY',
          taxCode: dto.taxCode,
          verificationTokenHash: tokenPayload.tokenHash,
          verificationExpiresAt: tokenPayload.expiresAt,
        },
      });
    }

    await this.sendVerificationEmailOrThrow(
      email,
      dto.name,
      tokenPayload.token,
    );

    return {
      message: 'Verification link has been sent',
    };
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
      undefined,
      true,
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

  async verifyEmail(
    token: string,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<VerifyEmailResult> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const pendingRegistration =
      await this.prisma.pendingOwnerRegistration.findFirst({
        where: {
          verificationTokenHash: tokenHash,
          verificationExpiresAt: { gt: new Date() },
        },
      });

    if (pendingRegistration) {
      const user = await this.prisma.$transaction(async (tx) => {
        const [existingUser, existingOrg, defaultPlan] = await Promise.all([
          tx.user.findUnique({
            where: { email: pendingRegistration.email },
            select: { id: true },
          }),
          tx.organization.findUnique({
            where: { slug: pendingRegistration.slug },
            select: { id: true },
          }),
          tx.subscriptionPlan.findUnique({
            where: { name: 'LU_HANH' },
          }),
        ]);

        if (existingUser) {
          throw new ConflictException('Email already registered');
        }

        if (existingOrg) {
          throw new ConflictException('Organization slug already exists');
        }

        if (!defaultPlan) {
          throw new BadRequestException(
            'Default subscription plan not found. Run seed first.',
          );
        }

        const newUser = await tx.user.create({
          data: {
            email: pendingRegistration.email,
            passwordHash: pendingRegistration.passwordHash,
            phone: pendingRegistration.phone,
            role: 'ORG_OWNER',
            isEmailVerified: true,
          },
        });

        const organization = await tx.organization.create({
          data: {
            ownerId: newUser.id,
            name: pendingRegistration.name,
            slug: pendingRegistration.slug,
            businessType: pendingRegistration.businessType,
            taxCode: pendingRegistration.taxCode,
            status: 'ACTIVE_FREE_TRIAL',
          },
        });

        await tx.subscription.create({
          data: {
            organizationId: organization.id,
            planId: defaultPlan.id,
            status: 'TRIALING',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ),
          },
        });

        await tx.pendingOwnerRegistration.delete({
          where: { id: pendingRegistration.id },
        });

        return newUser;
      });

      const tokens = await this.generateTokens(
        user.id,
        user.role,
        ipAddress,
        deviceInfo,
        undefined,
        true,
      );

      return {
        message: 'Email has been verified successfully',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        ...tokens,
      };
    }

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
    const normalizedEmail = email.toLowerCase();
    const pendingRegistration =
      await this.prisma.pendingOwnerRegistration.findUnique({
        where: { email: normalizedEmail },
      });

    if (pendingRegistration) {
      await this.issuePendingRegistrationVerification(
        pendingRegistration.id,
        pendingRegistration.email,
        pendingRegistration.name,
      );

      return {
        message: 'If the email exists, a verification link has been sent',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
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

    await this.issueUserEmailVerification(
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
    replaceExistingSessions = false,
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
    const nextFamilyId = familyId ?? randomUUID();

    if (replaceExistingSessions) {
      await this.prisma.$transaction(async (tx) => {
        await tx.refreshToken.deleteMany({
          where: { userId },
        });

        await tx.refreshToken.create({
          data: {
            userId,
            familyId: nextFamilyId,
            tokenHash,
            deviceInfo,
            ipAddress,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      });
    } else {
      await this.prisma.refreshToken.create({
        data: {
          userId,
          familyId: nextFamilyId,
          tokenHash,
          deviceInfo,
          ipAddress,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

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

  private createVerificationTokenPayload() {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    return {
      token,
      tokenHash,
      expiresAt: new Date(Date.now() + this.emailVerificationTtlMs),
    };
  }

  private async issuePendingRegistrationVerification(
    pendingRegistrationId: string,
    email: string,
    organizationName: string,
  ) {
    const verificationToken = this.createVerificationTokenPayload();

    await this.prisma.pendingOwnerRegistration.update({
      where: { id: pendingRegistrationId },
      data: {
        verificationTokenHash: verificationToken.tokenHash,
        verificationExpiresAt: verificationToken.expiresAt,
      },
    });

    await this.sendVerificationEmailOrThrow(
      email,
      organizationName,
      verificationToken.token,
    );
  }

  private async issueUserEmailVerification(
    userId: string,
    email: string,
    organizationName: string,
  ) {
    const verificationToken = this.createVerificationTokenPayload();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyTokenHash: verificationToken.tokenHash,
        emailVerifyExpiresAt: verificationToken.expiresAt,
      },
    });

    await this.sendVerificationEmailOrThrow(
      email,
      organizationName,
      verificationToken.token,
    );
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

  private async sendVerificationEmailOrThrow(
    email: string,
    organizationName: string,
    token: string,
  ) {
    try {
      await this.emailService.sendVerificationEmail({
        email,
        organizationName,
        token,
      });
    } catch (error) {
      this.logger.warn(
        `Unable to send verification email to ${email}: ${this.formatError(error)}`,
      );
      throw new ServiceUnavailableException(
        'Unable to send verification email',
      );
    }
  }
}
