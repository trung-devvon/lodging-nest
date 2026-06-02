import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestsService } from './guests.service';

describe('GuestsService', () => {
  let service: GuestsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      guestProfile: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      booking: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<GuestsService>(GuestsService);
  });

  it('computes total stays and total spent from checked-out bookings', async () => {
    prisma.$transaction.mockResolvedValue([
      [
        {
          id: 'guest-1',
          fullName: 'Guest 1',
          phone: '0901111222',
          tags: ['VIP'],
        },
      ],
      1,
    ]);
    prisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        guestProfileId: 'guest-1',
        finalPrice: new Prisma.Decimal('500000.00'),
        extensions: [{ extraPrice: new Prisma.Decimal('150000.00') }],
      },
      {
        id: 'booking-2',
        guestProfileId: 'guest-1',
        finalPrice: new Prisma.Decimal('300000.00'),
        extensions: [],
      },
    ]);

    const result = await service.findAll('org-1', { page: 1, limit: 20 });

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        guestProfileId: { in: ['guest-1'] },
        status: 'CHECKED_OUT',
      },
      select: {
        id: true,
        guestProfileId: true,
        finalPrice: true,
        extensions: {
          select: {
            extraPrice: true,
          },
        },
      },
    });
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'guest-1',
        totalStays: 2,
        totalSpent: expect.any(Prisma.Decimal),
      }),
    ]);
    expect(result.data[0].totalSpent.toFixed(2)).toBe('950000.00');
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
  });

  it('includes extensionTotalPrice and effectiveFinalPrice in recent bookings', async () => {
    prisma.guestProfile.findFirst.mockResolvedValue({
      id: 'guest-1',
      fullName: 'Guest 1',
      phone: '0901111222',
      email: 'guest@example.com',
      nationalId: null,
      nationality: 'VN',
      dateOfBirth: null,
      gender: 'MALE',
      notes: null,
      tags: ['VIP'],
      bookings: [
        {
          id: 'booking-1',
          bookingCode: 'BK-1',
          checkIn: new Date('2025-05-25T14:00:00.000Z'),
          checkOut: new Date('2025-05-26T12:00:00.000Z'),
          finalPrice: new Prisma.Decimal('500000.00'),
          status: 'CHECKED_OUT',
          extensions: [{ extraPrice: new Prisma.Decimal('150000.00') }],
        },
      ],
    });
    prisma.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        guestProfileId: 'guest-1',
        finalPrice: new Prisma.Decimal('500000.00'),
        extensions: [{ extraPrice: new Prisma.Decimal('150000.00') }],
      },
    ]);

    const result = await service.findOne('guest-1', 'org-1');

    expect(result.totalStays).toBe(1);
    expect(result.totalSpent.toFixed(2)).toBe('650000.00');
    expect(result.recentBookings).toEqual([
      expect.objectContaining({
        bookingCode: 'BK-1',
        finalPrice: expect.any(Prisma.Decimal),
        extensionTotalPrice: expect.any(Prisma.Decimal),
        effectiveFinalPrice: expect.any(Prisma.Decimal),
      }),
    ]);
    expect(result.recentBookings[0].extensionTotalPrice.toFixed(2)).toBe(
      '150000.00',
    );
    expect(result.recentBookings[0].effectiveFinalPrice.toFixed(2)).toBe(
      '650000.00',
    );
  });

  it('trims empty tags from the tags query filter', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.booking.findMany.mockResolvedValue([]);

    await service.findAll('org-1', { tags: ' VIP, ,REGULAR ' });

    expect(prisma.guestProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          tags: { hasSome: ['VIP', 'REGULAR'] },
        }),
      }),
    );
  });

  it('throws not found when guest does not belong to organization', async () => {
    prisma.guestProfile.findFirst.mockResolvedValue(null);

    await expect(service.findOne('guest-1', 'org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
