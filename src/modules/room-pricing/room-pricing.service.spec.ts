import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { RoomPricingService } from './room-pricing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessContextService } from '../../common/services/access-context.service';

describe('RoomPricingService', () => {
  let service: RoomPricingService;
  let prismaService: {
    room: { findFirst: jest.Mock };
    roomRate: { findFirst: jest.Mock };
    roomPricing: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let accessContextService: {
    ensureBranchManagerAccessToBranch: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      room: { findFirst: jest.fn() },
      roomRate: { findFirst: jest.fn() },
      roomPricing: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    accessContextService = {
      ensureBranchManagerAccessToBranch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomPricingService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: AccessContextService,
          useValue: accessContextService,
        },
      ],
    }).compile();

    service = module.get<RoomPricingService>(RoomPricingService);
  });

  it('allows a rate-specific rule to coexist with an overlapping room-wide rule', async () => {
    prismaService.room.findFirst.mockResolvedValue({
      id: 'room-1',
      name: 'Room 101',
      branchId: 'branch-1',
    });
    prismaService.roomRate.findFirst.mockResolvedValue({
      id: 'rate-1',
      label: '3 gio',
    });
    prismaService.roomPricing.findFirst.mockResolvedValueOnce(null);
    prismaService.roomPricing.create.mockResolvedValue({
      id: 'pricing-1',
      roomId: 'room-1',
      rateId: 'rate-1',
    });

    await expect(
      service.create('org-1', 'room-1', 'user-1', 'BRANCH_MANAGER', {
        rateId: 'rate-1',
        label: 'Cuoi tuan - 3 gio',
        startDate: '2025-05-24',
        endDate: '2025-05-25',
        priceAdjustType: 'FIXED',
        adjustValue: new Prisma.Decimal('0'),
        overridePrice: new Prisma.Decimal('280000.00'),
      }),
    ).resolves.toMatchObject({
      id: 'pricing-1',
      rateId: 'rate-1',
    });

    expect(prismaService.roomPricing.findFirst).toHaveBeenCalledWith({
      where: {
        roomId: 'room-1',
        isActive: true,
        id: undefined,
        startDate: { lte: new Date('2025-05-25') },
        endDate: { gte: new Date('2025-05-24') },
        rateId: 'rate-1',
      },
      select: {
        id: true,
        label: true,
        startDate: true,
        endDate: true,
      },
    });
  });

  it('rejects rateId from another room', async () => {
    prismaService.room.findFirst.mockResolvedValue({
      id: 'room-1',
      name: 'Room 101',
      branchId: 'branch-1',
    });
    prismaService.roomRate.findFirst.mockResolvedValue(null);

    await expect(
      service.create('org-1', 'room-1', 'user-1', 'ORG_MANAGER', {
        rateId: 'rate-other-room',
        label: 'Sai scope',
        startDate: '2025-05-24',
        endDate: '2025-05-25',
        priceAdjustType: 'FIXED',
        adjustValue: new Prisma.Decimal('0'),
        overridePrice: new Prisma.Decimal('280000.00'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects overlapping rules of the same scope', async () => {
    prismaService.room.findFirst.mockResolvedValue({
      id: 'room-1',
      name: 'Room 101',
      branchId: 'branch-1',
    });
    prismaService.roomPricing.findFirst.mockResolvedValue({
      id: 'pricing-existing',
      label: 'Le 30/4',
      startDate: new Date('2025-04-30'),
      endDate: new Date('2025-05-01'),
    });

    await expect(
      service.create('org-1', 'room-1', 'user-1', 'ORG_MANAGER', {
        label: 'Le khac',
        startDate: '2025-05-01',
        endDate: '2025-05-02',
        priceAdjustType: 'PERCENT_INCREASE',
        adjustValue: new Prisma.Decimal('20.00'),
      }),
    ).rejects.toThrow(ConflictException);
  });
});
