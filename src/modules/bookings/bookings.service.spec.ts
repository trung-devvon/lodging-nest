import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { HousekeepingDispatchService } from '../../common/services/housekeeping-dispatch.service';
import { OccupancyService } from '../../common/services/occupancy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BookingsService } from './bookings.service';

describe('BookingsService', () => {
  let service: BookingsService;
  let prismaService: {
    staff: { findMany: jest.Mock };
    room: { findFirst: jest.Mock; update: jest.Mock };
    roomRate: { findFirst: jest.Mock };
    guestProfile: { findFirst: jest.Mock };
    housekeepingTask: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    booking: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    roomPricing: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let auditService: {
    log: jest.Mock;
    logRoomStatusChange: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      staff: { findMany: jest.fn() },
      room: { findFirst: jest.fn(), update: jest.fn() },
      roomRate: { findFirst: jest.fn() },
      guestProfile: { findFirst: jest.fn() },
      housekeepingTask: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      booking: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      roomPricing: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    auditService = {
      log: jest.fn(),
      logRoomStatusChange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        HousekeepingDispatchService,
        OccupancyService,
        {
          provide: AuditService,
          useValue: auditService,
        },
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('applies room pricing with Decimal and checks availability with branch buffer', async () => {
    prismaService.room.findFirst.mockResolvedValue({
      id: 'room-1',
      branchId: 'branch-1',
      bufferHours: null,
      branch: { bufferHours: 2 },
    });
    prismaService.roomRate.findFirst.mockResolvedValue({
      id: 'rate-1',
      label: 'Qua dem',
      price: new Prisma.Decimal('100.10'),
    });
    prismaService.guestProfile.findFirst.mockResolvedValue({ id: 'guest-1' });
    prismaService.booking.findMany.mockResolvedValue([]);
    prismaService.booking.findUnique.mockResolvedValue(null);
    prismaService.roomPricing.findMany.mockResolvedValue([
      {
        rateId: null,
        priceAdjustType: 'PERCENT_INCREASE',
        adjustValue: new Prisma.Decimal('10'),
        overridePrice: new Prisma.Decimal('0'),
      },
      {
        rateId: 'rate-1',
        priceAdjustType: 'FIXED',
        adjustValue: new Prisma.Decimal('0'),
        overridePrice: new Prisma.Decimal('120.55'),
      },
    ]);
    prismaService.booking.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'booking-1',
        createdAt: new Date('2025-05-24T08:00:00.000Z'),
        ...data,
        room: { id: 'room-1', name: 'Phong 101' },
        guestProfile: {
          id: 'guest-1',
          fullName: 'Nguyen Van An',
          phone: '0901111222',
        },
        rate: { label: 'Qua dem' },
      }),
    );

    const result = await service.create(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'RECEPTIONIST',
        staffId: 'staff-1',
        branchId: 'branch-1',
      },
      {
        roomId: 'room-1',
        guestProfileId: 'guest-1',
        checkIn: '2025-05-24T14:00:00Z',
        checkOut: '2025-05-25T12:00:00Z',
        rateId: 'rate-1',
        numAdults: 2,
        source: 'WALK_IN',
        depositAmount: new Prisma.Decimal('20.155'),
      },
    );

    expect(prismaService.booking.findMany).toHaveBeenCalledWith({
      where: {
        roomId: 'room-1',
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: new Date('2025-05-25T14:00:00.000Z') },
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        actualCheckOut: true,
      },
      orderBy: { checkIn: 'asc' },
    });
    expect(result.basePrice).toBeInstanceOf(Prisma.Decimal);
    expect(result.finalPrice).toBeInstanceOf(Prisma.Decimal);
    expect(result.basePrice.toFixed(2)).toBe('100.10');
    expect(result.finalPrice.toFixed(2)).toBe('120.55');
    expect(result.depositAmount.toFixed(2)).toBe('20.16');
    expect(result.guest).toEqual({
      id: 'guest-1',
      fullName: 'Nguyen Van An',
      phone: '0901111222',
    });
    expect(result.rateLabel).toBe('Qua dem');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BOOKING_CREATED',
        targetTable: 'bookings',
        targetId: 'booking-1',
      }),
    );
  });

  it('rejects guest profiles outside the organization', async () => {
    prismaService.room.findFirst.mockResolvedValue({
      id: 'room-1',
      branchId: 'branch-1',
      bufferHours: 1,
      branch: { bufferHours: 2 },
    });
    prismaService.roomRate.findFirst.mockResolvedValue({
      id: 'rate-1',
      label: 'Qua dem',
      price: new Prisma.Decimal('100.00'),
    });
    prismaService.guestProfile.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'BRANCH_MANAGER',
          staffId: 'staff-1',
          branchId: 'branch-1',
        },
        {
          roomId: 'room-1',
          guestProfileId: 'guest-2',
          checkIn: '2025-05-24T14:00:00Z',
          checkOut: '2025-05-25T12:00:00Z',
          rateId: 'rate-1',
          numAdults: 2,
          source: 'WALK_IN',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks receptionist from cancelling bookings', async () => {
    prismaService.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      roomId: 'room-1',
      status: 'CONFIRMED',
      room: {
        id: 'room-1',
        branchId: 'branch-1',
        status: 'AVAILABLE',
      },
    });

    await expect(
      service.updateStatus(
        'booking-1',
        {
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'RECEPTIONIST',
          staffId: 'staff-1',
          branchId: 'branch-1',
        },
        {
          status: 'CANCELLED',
          cancelReason: 'Khach doi lich',
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('moves room to maintenance and writes audit logs when checking out the last checked-in booking', async () => {
    prismaService.booking.findFirst
      .mockResolvedValueOnce({
        id: 'booking-1',
        roomId: 'room-1',
        status: 'CHECKED_IN',
        room: {
          id: 'room-1',
          branchId: 'branch-1',
          status: 'OCCUPIED',
        },
      })
      .mockResolvedValueOnce(null);
    prismaService.booking.update.mockResolvedValue({
      id: 'booking-1',
      bookingCode: 'BK-1',
      status: 'CHECKED_OUT',
      actualCheckOut: new Date('2025-05-26T11:30:00.000Z'),
      cancelledAt: null,
      cancelReason: null,
    });
    prismaService.room.update.mockResolvedValue({
      id: 'room-1',
      status: 'MAINTENANCE',
    });
    prismaService.housekeepingTask.findFirst.mockResolvedValue(null);
    prismaService.staff.findMany.mockResolvedValue([]);
    prismaService.housekeepingTask.create.mockResolvedValue({});

    await service.updateStatus(
      'booking-1',
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'BRANCH_MANAGER',
        staffId: 'staff-1',
        branchId: 'branch-1',
        actorIp: '127.0.0.1',
      },
      {
        status: 'CHECKED_OUT',
      },
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BOOKING_STATUS_CHANGED',
        targetId: 'booking-1',
      }),
    );
    expect(auditService.logRoomStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: 'room-1',
        fromStatus: 'OCCUPIED',
        toStatus: 'MAINTENANCE',
        bookingId: 'booking-1',
      }),
    );
  });

  it('writes an audit entry when adjusting booking price', async () => {
    prismaService.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      bookingCode: 'BK-1',
      finalPrice: new Prisma.Decimal('450.00'),
      priceNote: 'Gia cu',
      room: {
        branchId: 'branch-1',
      },
    });
    prismaService.booking.update.mockResolvedValue({
      id: 'booking-1',
      finalPrice: new Prisma.Decimal('500.00'),
      priceNote: 'Tang gia ngay le',
    });

    await service.updatePrice(
      'booking-1',
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'BRANCH_MANAGER',
        staffId: 'staff-1',
        branchId: 'branch-1',
        actorIp: '127.0.0.1',
      },
      {
        finalPrice: new Prisma.Decimal('500.00'),
        priceNote: 'Tang gia ngay le',
      },
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BOOKING_PRICE_UPDATED',
        targetId: 'booking-1',
        oldValue: {
          finalPrice: new Prisma.Decimal('450.00'),
          priceNote: 'Gia cu',
        },
        newValue: {
          finalPrice: new Prisma.Decimal('500.00'),
          priceNote: 'Tang gia ngay le',
        },
      }),
    );
  });

  it('treats extended actual checkout as occupied time for new bookings', async () => {
    prismaService.room.findFirst.mockResolvedValue({
      id: 'room-1',
      branchId: 'branch-1',
      bufferHours: null,
      branch: { bufferHours: 2 },
    });
    prismaService.roomRate.findFirst.mockResolvedValue({
      id: 'rate-1',
      label: 'Qua dem',
      price: new Prisma.Decimal('100.00'),
    });
    prismaService.guestProfile.findFirst.mockResolvedValue({ id: 'guest-1' });
    prismaService.booking.findMany.mockResolvedValue([
      {
        id: 'booking-existing',
        checkIn: new Date('2025-05-24T14:00:00.000Z'),
        checkOut: new Date('2025-05-25T12:00:00.000Z'),
        actualCheckOut: new Date('2025-05-25T14:00:00.000Z'),
      },
    ]);

    await expect(
      service.create(
        {
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'RECEPTIONIST',
          staffId: 'staff-1',
          branchId: 'branch-1',
        },
        {
          roomId: 'room-1',
          guestProfileId: 'guest-1',
          checkIn: '2025-05-25T15:00:00Z',
          checkOut: '2025-05-26T12:00:00Z',
          rateId: 'rate-1',
          numAdults: 2,
          source: 'WALK_IN',
        },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'ROOM_NOT_AVAILABLE',
      }),
    });
  });

  it('returns effective booking total including extension charges', async () => {
    prismaService.booking.findFirst.mockResolvedValue({
      id: 'booking-1',
      bookingCode: 'BK-20250525-A3K9',
      checkIn: new Date('2025-05-25T14:00:00.000Z'),
      checkOut: new Date('2025-05-26T12:00:00.000Z'),
      actualCheckOut: new Date('2025-05-26T14:00:00.000Z'),
      basePrice: new Prisma.Decimal('500000.00'),
      finalPrice: new Prisma.Decimal('550000.00'),
      depositAmount: new Prisma.Decimal('200000.00'),
      numAdults: 2,
      numChildren: 0,
      source: 'WALK_IN',
      note: 'Khach o them',
      status: 'CHECKED_IN',
      guestProfile: {
        id: 'guest-1',
        fullName: 'Nguyen Van An',
        phone: '0901111222',
        email: 'an@example.com',
      },
      room: {
        id: 'room-1',
        name: 'Phong 101',
        branch: { name: 'Co so 1' },
      },
      createdByStaff: {
        id: 'staff-1',
        position: 'Le tan',
      },
      rate: { label: 'Qua dem' },
      extensions: [
        {
          id: 'ext-1',
          bookingId: 'booking-1',
          extraHours: 2,
          extraPrice: new Prisma.Decimal('150000.00'),
          newCheckOut: new Date('2025-05-26T14:00:00.000Z'),
          approvedByStaffId: 'staff-1',
          note: 'O them',
          createdAt: new Date('2025-05-26T11:00:00.000Z'),
        },
        {
          id: 'ext-2',
          bookingId: 'booking-1',
          extraHours: 1,
          extraPrice: new Prisma.Decimal('50000.00'),
          newCheckOut: new Date('2025-05-26T15:00:00.000Z'),
          approvedByStaffId: 'staff-1',
          note: null,
          createdAt: new Date('2025-05-26T12:00:00.000Z'),
        },
      ],
    });

    const result = await service.findOne('booking-1', {
      organizationId: 'org-1',
      userId: 'user-1',
      role: 'ORG_OWNER',
    });

    expect(result.extensionTotalPrice.toFixed(2)).toBe('200000.00');
    expect(result.effectiveFinalPrice.toFixed(2)).toBe('750000.00');
  });

  it('blocks branch-scoped staff from querying another branch', async () => {
    await expect(
      service.findAll(
        {
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'RECEPTIONIST',
          staffId: 'staff-1',
          branchId: 'branch-1',
        },
        {
          branchId: 'branch-2',
          page: 1,
          limit: 20,
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates a checkout cleaning task when booking is checked out', async () => {
    prismaService.booking.findFirst
      .mockResolvedValueOnce({
        id: 'booking-1',
        roomId: 'room-1',
        status: 'CHECKED_IN',
        room: {
          id: 'room-1',
          branchId: 'branch-1',
          status: 'OCCUPIED',
        },
      })
      .mockResolvedValueOnce(null);
    prismaService.booking.update.mockResolvedValue({
      id: 'booking-1',
      bookingCode: 'BK-20250525-A3K9',
      status: 'CHECKED_OUT',
      actualCheckOut: new Date('2025-05-26T11:30:00.000Z'),
      cancelledAt: null,
      cancelReason: null,
    });
    prismaService.housekeepingTask.findFirst.mockResolvedValue(null);
    prismaService.housekeepingTask.findMany.mockResolvedValue([]);
    prismaService.staff.findMany.mockResolvedValue([
      { id: 'staff-hk-1', position: 'Tap vu tang 1' },
    ]);
    prismaService.housekeepingTask.create.mockResolvedValue({ id: 'task-1' });

    await service.updateStatus(
      'booking-1',
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'BRANCH_MANAGER',
        staffId: 'staff-1',
        branchId: 'branch-1',
      },
      {
        status: 'CHECKED_OUT',
        actualCheckOut: '2025-05-26T11:30:00Z',
      },
    );

    expect(prismaService.housekeepingTask.create).toHaveBeenCalledWith({
      data: {
        roomId: 'room-1',
        bookingId: 'booking-1',
        assignedToStaffId: 'staff-hk-1',
        assignedByStaffId: 'staff-1',
        branchId: 'branch-1',
        taskType: 'CHECKOUT_CLEAN',
        scheduledDate: new Date('2025-05-26T00:00:00.000Z'),
        scheduledTime: '11:30',
        notes: 'Auto-created when booking was checked out',
      },
    });
    expect(prismaService.room.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { status: 'MAINTENANCE' },
    });
  });
});
