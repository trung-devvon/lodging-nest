import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
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
      create: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    pendingOwnerRegistration: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    subscriptionPlan: {
      findUnique: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
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
    emailService.sendVerificationEmail.mockResolvedValue(undefined);
    emailService.sendResetPasswordEmail.mockResolvedValue(undefined);
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

  it('register stores a pending owner registration and sends a verification email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.organization.findUnique.mockResolvedValue(null);
    prisma.pendingOwnerRegistration.findUnique.mockResolvedValue(null);
    prisma.pendingOwnerRegistration.create.mockResolvedValue({
      id: 'pending-1',
      email: 'owner@example.com',
    });

    const result = await service.register({
      email: 'owner@example.com',
      password: 'Abc@123456',
      name: 'An Nhien Homestay',
      slug: 'an-nhien-homestay',
      phone: '0901234567',
    });

    expect(result).toEqual({
      message: 'Verification link has been sent',
    });
    expect(prisma.pendingOwnerRegistration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'owner@example.com',
        businessType: 'HOMESTAY',
        verificationTokenHash: expect.any(String),
        verificationExpiresAt: expect.any(Date),
      }),
    });
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@example.com',
        organizationName: 'An Nhien Homestay',
        token: expect.any(String),
      }),
    );
  });

  it('register fails when the verification email cannot be sent', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.organization.findUnique.mockResolvedValue(null);
    prisma.pendingOwnerRegistration.findUnique.mockResolvedValue(null);
    prisma.pendingOwnerRegistration.create.mockResolvedValue({
      id: 'pending-1',
      email: 'owner@example.com',
    });
    emailService.sendVerificationEmail.mockRejectedValue(
      new Error('smtp rejected credentials'),
    );

    await expect(
      service.register({
        email: 'owner@example.com',
        password: 'Abc@123456',
        name: 'An Nhien Homestay',
        slug: 'an-nhien-homestay',
        phone: '0901234567',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
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

  it('login replaces existing refresh token sessions for the user', async () => {
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
    prisma.user.update.mockResolvedValue({ id: 'user-1' });
    jwtService.signAsync.mockResolvedValue('access-token');
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        refreshToken: {
          deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
          create: jest.fn().mockResolvedValue({ id: 'refresh-1' }),
        },
      }),
    );

    await expect(
      service.login({
        email: 'owner@example.com',
        password: 'Abc@123456',
      }),
    ).resolves.toEqual({
      user: expect.objectContaining({
        id: 'user-1',
        email: 'owner@example.com',
        role: 'ORG_OWNER',
      }),
      accessToken: 'access-token',
      refreshToken: expect.any(String),
    });
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

  it('verifyEmail completes pending owner registration when the token is valid', async () => {
    prisma.pendingOwnerRegistration.findFirst.mockResolvedValue({
      id: 'pending-1',
      email: 'owner@example.com',
      passwordHash: 'hashed-password',
      phone: '0901234567',
      name: 'An Nhien Homestay',
      slug: 'an-nhien-homestay',
      taxCode: '0123456789',
      businessType: 'HOMESTAY',
    });
    prisma.$transaction
      .mockImplementationOnce(async (callback: any) =>
        callback({
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'user-1',
              email: 'owner@example.com',
              role: 'ORG_OWNER',
              isEmailVerified: true,
            }),
          },
          organization: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'org-1' }),
          },
          subscriptionPlan: {
            findUnique: jest.fn().mockResolvedValue({ id: 'plan-1' }),
          },
          subscription: {
            create: jest.fn().mockResolvedValue({ id: 'sub-1' }),
          },
          pendingOwnerRegistration: {
            delete: jest.fn().mockResolvedValue({ id: 'pending-1' }),
          },
        }),
      )
      .mockImplementationOnce(async (callback: any) =>
        callback({
          refreshToken: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: jest.fn().mockResolvedValue({ id: 'refresh-1' }),
          },
        }),
      );
    jwtService.signAsync.mockResolvedValue('access-token');

    await expect(service.verifyEmail('plain-token')).resolves.toEqual({
      message: 'Email has been verified successfully',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        role: 'ORG_OWNER',
        isEmailVerified: true,
      },
      accessToken: 'access-token',
      refreshToken: expect.any(String),
    });

    expect(prisma.pendingOwnerRegistration.findFirst).toHaveBeenCalledWith({
      where: {
        verificationTokenHash: expect.any(String),
        verificationExpiresAt: { gt: expect.any(Date) },
      },
    });
  });

  it('resendVerificationEmail reissues a token for pending registrations', async () => {
    prisma.pendingOwnerRegistration.findUnique.mockResolvedValue({
      id: 'pending-1',
      email: 'owner@example.com',
      name: 'An Nhien Homestay',
    });
    prisma.pendingOwnerRegistration.update.mockResolvedValue({
      id: 'pending-1',
    });

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
