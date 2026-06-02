import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OccupancyService } from '../../common/services/occupancy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingExtensionsService } from './booking-extensions.service';

describe('BookingExtensionsService', () => {
  let service: BookingExtensionsService;
  let prismaService: {
    booking: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    bookingExtension: {
      create: jest.Mock;
      findMany: jest.Mock;
      aggregate: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      booking: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      bookingExtension: {
        create: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingExtensionsService,
        OccupancyService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<BookingExtensionsService>(BookingExtensionsService);
  });

  it('creates an extension and updates booking actual checkout', async () => {
    prismaService.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      roomId: 'room-1',
      checkOut: new Date('2025-05-26T12:00:00.000Z'),
      actualCheckOut: null,
      finalPrice: new Prisma.Decimal('550000.00'),
      room: {
        branchId: 'branch-1',
        bufferHours: null,
        branch: { bufferHours: 2 },
      },
    });
    prismaService.booking.findMany.mockResolvedValue([]);
    prismaService.bookingExtension.create.mockResolvedValue({
      id: 'ext-1',
      bookingId: 'booking-1',
      extraHours: 2,
      extraPrice: new Prisma.Decimal('150000.00'),
      newCheckOut: new Date('2025-05-26T14:00:00.000Z'),
      createdAt: new Date('2025-05-26T11:00:00.000Z'),
    });
    prismaService.booking.update.mockResolvedValue({
      id: 'booking-1',
      actualCheckOut: new Date('2025-05-26T14:00:00.000Z'),
    });
    prismaService.bookingExtension.aggregate.mockResolvedValue({
      _sum: { extraPrice: new Prisma.Decimal('150000.00') },
    });
    prismaService.$transaction.mockImplementation((callback) =>
      callback(prismaService),
    );

    const result = await service.create(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'RECEPTIONIST',
        staffId: 'staff-1',
        branchId: 'branch-1',
      },
      'booking-1',
      {
        extraHours: 2,
        extraPrice: new Prisma.Decimal('150000.00'),
        note: 'Khach o them',
      },
    );

    expect(prismaService.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { actualCheckOut: new Date('2025-05-26T14:00:00.000Z') },
      select: { id: true },
    });
    expect(prismaService.bookingExtension.create).toHaveBeenCalledWith({
      data: {
        bookingId: 'booking-1',
        extraHours: 2,
        extraPrice: new Prisma.Decimal('150000.00'),
        newCheckOut: new Date('2025-05-26T14:00:00.000Z'),
        approvedByStaffId: 'staff-1',
        note: 'Khach o them',
      },
      select: {
        id: true,
        bookingId: true,
        extraHours: true,
        extraPrice: true,
        newCheckOut: true,
        createdAt: true,
      },
    });
    expect(result).toMatchObject({
      id: 'ext-1',
      priceSummary: {
        bookingFinalPrice: new Prisma.Decimal('550000.00'),
        extensionTotalPrice: new Prisma.Decimal('150000.00'),
        effectiveFinalPrice: new Prisma.Decimal('700000.00'),
      },
    });
  });

  it('uses the latest actual checkout and branch buffer when checking conflicts', async () => {
    prismaService.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      roomId: 'room-1',
      checkOut: new Date('2025-05-26T11:00:00.000Z'),
      actualCheckOut: new Date('2025-05-26T12:00:00.000Z'),
      finalPrice: new Prisma.Decimal('550000.00'),
      room: {
        branchId: 'branch-1',
        bufferHours: null,
        branch: { bufferHours: 2 },
      },
    });
    prismaService.booking.findMany.mockResolvedValue([
      {
        id: 'booking-2',
        checkIn: new Date('2025-05-26T15:00:00.000Z'),
        checkOut: new Date('2025-05-27T12:00:00.000Z'),
        actualCheckOut: null,
      },
    ]);

    await expect(
      service.create(
        {
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'BRANCH_MANAGER',
          staffId: 'staff-1',
          branchId: 'branch-1',
        },
        'booking-1',
        {
          extraHours: 2,
          extraPrice: new Prisma.Decimal('150000.00'),
        },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'EXTENSION_CONFLICT',
        message: expect.stringContaining('Max extension: 1 hour(s).'),
      }),
    });
  });

  it('blocks branch-scoped staff from another branch when listing extensions', async () => {
    prismaService.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      room: {
        branchId: 'branch-2',
      },
    });

    await expect(
      service.findAll(
        {
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'RECEPTIONIST',
          staffId: 'staff-1',
          branchId: 'branch-1',
        },
        'booking-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
