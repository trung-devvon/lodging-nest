import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { RoomRatesService } from './room-rates.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessContextService } from '../../common/services/access-context.service';

describe('RoomRatesService', () => {
  let service: RoomRatesService;
  let prismaService: {
    room: { findFirst: jest.Mock };
    roomRate: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  };
  let accessContextService: {
    ensureBranchManagerAccessToBranch: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      room: { findFirst: jest.fn() },
      roomRate: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    accessContextService = {
      ensureBranchManagerAccessToBranch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomRatesService,
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

    service = module.get<RoomRatesService>(RoomRatesService);
  });

  it('enforces branch manager scope when creating a rate', async () => {
    prismaService.room.findFirst.mockResolvedValue({
      id: 'room-1',
      branchId: 'branch-1',
    });
    accessContextService.ensureBranchManagerAccessToBranch.mockRejectedValue(
      new ForbiddenException(
        'You can only manage room rates in your assigned branch',
      ),
    );

    await expect(
      service.create('org-1', 'room-1', 'user-1', 'BRANCH_MANAGER', {
        label: '3 gio',
        durationHours: 3,
        price: new Prisma.Decimal('200000.00'),
        sortOrder: 1,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(
      accessContextService.ensureBranchManagerAccessToBranch,
    ).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'BRANCH_MANAGER',
      'branch-1',
      'room rates',
    );
    expect(prismaService.roomRate.create).not.toHaveBeenCalled();
  });

  it('deactivates a rate instead of hard deleting it', async () => {
    prismaService.roomRate.findFirst.mockResolvedValue({
      id: 'rate-1',
      isActive: true,
    });
    prismaService.roomRate.update.mockResolvedValue({
      id: 'rate-1',
      isActive: false,
    });

    await expect(service.remove('rate-1', 'org-1')).resolves.toEqual({
      message: 'Room rate has been deactivated',
    });

    expect(prismaService.roomRate.update).toHaveBeenCalledWith({
      where: { id: 'rate-1' },
      data: { isActive: false },
    });
  });
});
