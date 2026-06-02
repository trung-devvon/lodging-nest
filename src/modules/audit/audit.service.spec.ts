import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    auditLog: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (queries: any[]) =>
      Promise.all(queries),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('scopes org owners to their own organization when listing logs', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'audit-1',
        organizationId: 'org-1',
      },
    ]);
    prisma.auditLog.count.mockResolvedValue(1);

    await service.findAll(
      {
        userId: 'owner-1',
        role: 'ORG_OWNER',
        organizationId: 'org-1',
      },
      {
        page: 1,
        limit: 20,
      },
    );

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-1',
        },
      }),
    );
  });

  it('rejects org owners requesting another organization', async () => {
    await expect(
      service.findAll(
        {
          userId: 'owner-1',
          role: 'ORG_OWNER',
          organizationId: 'org-1',
        },
        {
          organizationId: 'org-2',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('serializes Decimal and Date fields before persisting audit data', async () => {
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    await service.log({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      action: 'BOOKING_CREATED',
      targetTable: 'bookings',
      targetId: 'booking-1',
      newValue: {
        finalPrice: new Prisma.Decimal('500.50'),
        checkIn: new Date('2026-06-01T02:30:00.000Z'),
      },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        newValue: {
          finalPrice: '500.5',
          checkIn: '2026-06-01T02:30:00.000Z',
        },
      }),
    });
  });
});
