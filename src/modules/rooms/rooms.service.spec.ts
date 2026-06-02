import { Test, TestingModule } from '@nestjs/testing';
import { AccessContextService } from '../../common/services/access-context.service';
import { OccupancyService } from '../../common/services/occupancy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;
  let prismaService: {
    branch: { findFirst: jest.Mock };
    room: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    booking: { findMany: jest.Mock };
  };
  let accessContextService: {
    ensureBranchManagerAccessToBranch: jest.Mock;
  };
  let auditService: {
    logRoomStatusChange: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      branch: { findFirst: jest.fn() },
      room: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      booking: { findMany: jest.fn() },
    };
    accessContextService = {
      ensureBranchManagerAccessToBranch: jest.fn(),
    };
    auditService = {
      logRoomStatusChange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        OccupancyService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: AccessContextService,
          useValue: accessContextService,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uses actual checkout plus buffer when reporting room availability', async () => {
    prismaService.branch.findFirst.mockResolvedValue({
      id: 'branch-1',
      organizationId: 'org-1',
      bufferHours: 2,
    });
    prismaService.room.findMany.mockResolvedValue([
      { id: 'room-1', name: 'Phong 101', bufferHours: null },
      { id: 'room-2', name: 'Phong 102', bufferHours: 1 },
    ]);
    prismaService.booking.findMany.mockResolvedValue([
      {
        roomId: 'room-1',
        checkIn: new Date('2025-05-24T14:00:00.000Z'),
        checkOut: new Date('2025-05-25T12:00:00.000Z'),
        actualCheckOut: new Date('2025-05-25T14:00:00.000Z'),
      },
      {
        roomId: 'room-2',
        checkIn: new Date('2025-05-24T14:00:00.000Z'),
        checkOut: new Date('2025-05-25T12:00:00.000Z'),
        actualCheckOut: null,
      },
    ]);

    const result = await service.checkAvailability(
      'org-1',
      'branch-1',
      new Date('2025-05-25T15:00:00.000Z'),
      new Date('2025-05-26T12:00:00.000Z'),
    );

    expect(result).toEqual([
      {
        id: 'room-1',
        name: 'Phong 101',
        isAvailable: false,
        nextAvailableAt: '2025-05-25T16:00:00.000Z',
      },
      {
        id: 'room-2',
        name: 'Phong 102',
        isAvailable: true,
        nextAvailableAt: undefined,
      },
    ]);
  });

  it('extends nextAvailableAt through chained bookings in the same room', async () => {
    prismaService.branch.findFirst.mockResolvedValue({
      id: 'branch-1',
      organizationId: 'org-1',
      bufferHours: 2,
    });
    prismaService.room.findMany.mockResolvedValue([
      { id: 'room-1', name: 'Phong 101', bufferHours: null },
    ]);
    prismaService.booking.findMany.mockResolvedValue([
      {
        roomId: 'room-1',
        checkIn: new Date('2025-05-25T10:00:00.000Z'),
        checkOut: new Date('2025-05-25T12:00:00.000Z'),
        actualCheckOut: new Date('2025-05-25T14:00:00.000Z'),
      },
      {
        roomId: 'room-1',
        checkIn: new Date('2025-05-25T16:00:00.000Z'),
        checkOut: new Date('2025-05-25T18:00:00.000Z'),
        actualCheckOut: null,
      },
      {
        roomId: 'room-1',
        checkIn: new Date('2025-05-25T20:00:00.000Z'),
        checkOut: new Date('2025-05-25T22:00:00.000Z'),
        actualCheckOut: null,
      },
    ]);

    const result = await service.checkAvailability(
      'org-1',
      'branch-1',
      new Date('2025-05-25T15:00:00.000Z'),
      new Date('2025-05-25T15:30:00.000Z'),
    );

    expect(result).toEqual([
      {
        id: 'room-1',
        name: 'Phong 101',
        isAvailable: false,
        nextAvailableAt: '2025-05-26T00:00:00.000Z',
      },
    ]);
  });

  it('writes an audit entry when room status is changed manually', async () => {
    prismaService.room.findFirst.mockResolvedValue({
      id: 'room-1',
      branchId: 'branch-1',
      status: 'AVAILABLE',
    });
    prismaService.room.update.mockResolvedValue({
      id: 'room-1',
      name: 'Phong 101',
      status: 'MAINTENANCE',
    });

    await service.updateStatus(
      'room-1',
      'org-1',
      'user-1',
      'BRANCH_MANAGER',
      { status: 'MAINTENANCE' },
      '127.0.0.1',
    );

    expect(auditService.logRoomStatusChange).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      actorIp: '127.0.0.1',
      roomId: 'room-1',
      fromStatus: 'AVAILABLE',
      toStatus: 'MAINTENANCE',
      source: 'manual_room_status_update',
    });
  });
});
