import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import { AccessContextService } from '../../common/services/access-context.service';

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const emailService = {
    sendVerificationEmail: jest.fn(),
    sendResetPasswordEmail: jest.fn(),
  };

  const accessContextService = {
    ensureWorkspaceAccessOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    accessContextService.ensureWorkspaceAccessOrThrow.mockResolvedValue({
      organizationId: 'org-1',
      status: 'ACTIVE_FREE_TRIAL',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailService, useValue: emailService },
        { provide: AccessContextService, useValue: accessContextService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('register sends a verification email after creating the owner account', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.organization.findUnique.mockResolvedValue(null);
    const organizationCreate = jest.fn().mockResolvedValue({ id: 'org-1' });
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        subscriptionPlan: {
          findUnique: jest.fn().mockResolvedValue({ id: 'plan-1' }),
        },
        user: {
          create: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'owner@example.com',
            role: 'ORG_OWNER',
            isEmailVerified: false,
          }),
        },
        organization: {
          create: organizationCreate,
        },
        subscription: {
          create: jest.fn().mockResolvedValue({ id: 'sub-1' }),
        },
      }),
    );
    jwtService.signAsync.mockResolvedValue('access-token');
    prisma.refreshToken.create.mockResolvedValue({ id: 'refresh-1' });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    const result = await service.register({
      email: 'owner@example.com',
      password: 'Abc@123456',
      name: 'An Nhien Homestay',
      slug: 'an-nhien-homestay',
      phone: '0901234567',
    });

    expect(result.user.email).toBe('owner@example.com');
    expect(organizationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'ACTIVE_FREE_TRIAL',
      }),
    });
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@example.com',
        organizationName: 'An Nhien Homestay',
        token: expect.any(String),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        emailVerifyTokenHash: expect.any(String),
        emailVerifyExpiresAt: expect.any(Date),
      },
    });
  });

  it('login rejects tenant users whose organization is no longer active', async () => {
    const passwordHash = await argon2.hash('Abc@123456');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      role: 'ORG_OWNER',
      isActive: true,
      deletedAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      passwordHash,
    });
    accessContextService.ensureWorkspaceAccessOrThrow.mockRejectedValue(
      new ForbiddenException('Organization is not active'),
    );

    await expect(
      service.login({
        email: 'owner@example.com',
        password: 'Abc@123456',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forgotPassword returns a generic response for unknown emails', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.forgotPassword({ email: 'missing@example.com' }),
    ).resolves.toEqual({
      message: 'If the email exists, a reset link has been sent',
    });

    expect(emailService.sendResetPasswordEmail).not.toHaveBeenCalled();
  });

  it('forgotPassword stores a reset token and sends the reset email', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.forgotPassword({ email: 'owner@example.com' }),
    ).resolves.toEqual({
      message: 'If the email exists, a reset link has been sent',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        resetTokenHash: expect.any(String),
        resetTokenExpiresAt: expect.any(Date),
      },
    });
    expect(emailService.sendResetPasswordEmail).toHaveBeenCalledWith({
      email: 'owner@example.com',
      token: expect.any(String),
    });
  });

  it('verifyEmail marks the user as verified when the token is valid', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      isEmailVerified: false,
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    await expect(service.verifyEmail('plain-token')).resolves.toEqual({
      message: 'Email has been verified successfully',
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        emailVerifyTokenHash: expect.any(String),
        emailVerifyExpiresAt: { gt: expect.any(Date) },
      },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        isEmailVerified: true,
        emailVerifyTokenHash: null,
        emailVerifyExpiresAt: null,
      },
    });
  });

  it('resendVerificationEmail reissues a token for unverified accounts', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      isEmailVerified: false,
    });
    prisma.organization.findFirst.mockResolvedValue({
      name: 'An Nhien Homestay',
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.resendVerificationEmail('owner@example.com'),
    ).resolves.toEqual({
      message: 'If the email exists, a verification link has been sent',
    });

    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@example.com',
        organizationName: 'An Nhien Homestay',
        token: expect.any(String),
      }),
    );
  });
});
