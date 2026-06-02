import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HousekeepingDispatchService } from '../../common/services/housekeeping-dispatch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { HousekeepingService } from './housekeeping.service';

describe('HousekeepingService', () => {
  let service: HousekeepingService;
  let prismaService: {
    room: { findFirst: jest.Mock; update: jest.Mock };
    booking: { findFirst: jest.Mock };
    staff: { findFirst: jest.Mock; findMany: jest.Mock };
    housekeepingTask: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditService: {
    logRoomStatusChange: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      room: { findFirst: jest.fn(), update: jest.fn() },
      booking: { findFirst: jest.fn() },
      staff: { findFirst: jest.fn(), findMany: jest.fn() },
      housekeepingTask: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    auditService = {
      logRoomStatusChange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousekeepingService,
        HousekeepingDispatchService,
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

    service = module.get<HousekeepingService>(HousekeepingService);
  });

  it('rejects assigning a task to a non-housekeeper or another branch', async () => {
    prismaService.room.findFirst.mockResolvedValue({
      id: 'room-1',
      branchId: 'branch-1',
      branch: { organizationId: 'org-1' },
    });
    prismaService.staff.findFirst.mockResolvedValue(null);

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
          assignedToStaffId: 'staff-2',
          taskType: 'DEEP_CLEAN',
          scheduledDate: '2025-05-26',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('forces housekeepers to only see their own tasks', async () => {
    await expect(
      service.findAll(
        {
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'HOUSEKEEPER',
          staffId: 'staff-1',
          branchId: 'branch-1',
        },
        {
          assignedToStaffId: 'staff-2',
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('paginates housekeeping tasks and prioritizes checkout cleaning first', async () => {
    prismaService.housekeepingTask.findMany.mockResolvedValue([
      {
        id: 'task-2',
        taskType: 'DEEP_CLEAN',
        scheduledDate: new Date('2025-05-26T00:00:00.000Z'),
        scheduledTime: '10:00',
        status: 'PENDING',
        notes: null,
        room: { id: 'room-1', name: 'Phong 101', floorNumber: 1 },
        assignedToStaff: null,
        assignedByStaff: null,
      },
      {
        id: 'task-1',
        taskType: 'CHECKOUT_CLEAN',
        scheduledDate: new Date('2025-05-26T00:00:00.000Z'),
        scheduledTime: '12:00',
        status: 'PENDING',
        notes: null,
        room: { id: 'room-1', name: 'Phong 101', floorNumber: 1 },
        assignedToStaff: null,
        assignedByStaff: null,
      },
    ]);

    const result = await service.findAll(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'BRANCH_MANAGER',
        staffId: 'staff-1',
        branchId: 'branch-1',
      },
      {
        branchId: 'branch-1',
        page: 1,
        limit: 1,
      },
    );

    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: 'task-1',
          priority: 'HIGH',
        }),
      ],
      meta: { total: 2, page: 1, limit: 1 },
    });
  });

  it('blocks housekeepers from updating tasks assigned to someone else', async () => {
    prismaService.housekeepingTask.findFirst.mockResolvedValue({
      id: 'task-1',
      branchId: 'branch-1',
      assignedToStaffId: 'staff-2',
      status: 'PENDING',
    });

    await expect(
      service.updateStatus(
        {
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'HOUSEKEEPER',
          staffId: 'staff-1',
          branchId: 'branch-1',
        },
        'task-1',
        {
          status: 'IN_PROGRESS',
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('extends status timestamps when manager marks a task done directly', async () => {
    prismaService.housekeepingTask.findFirst.mockResolvedValue({
      id: 'task-1',
      branchId: 'branch-1',
      assignedToStaffId: 'staff-2',
      status: 'PENDING',
    });
    prismaService.housekeepingTask.update.mockResolvedValue({
      id: 'task-1',
      status: 'DONE',
      startedAt: new Date('2025-05-26T10:00:00.000Z'),
      completedAt: new Date('2025-05-26T10:00:00.000Z'),
    });

    await service.updateStatus(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'BRANCH_MANAGER',
        staffId: 'staff-1',
        branchId: 'branch-1',
      },
      'task-1',
      {
        status: 'DONE',
      },
    );

    expect(prismaService.housekeepingTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          status: 'DONE',
          startedAt: expect.any(Date),
          completedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('releases a room to AVAILABLE when checkout cleaning is done and no open blockers remain', async () => {
    prismaService.housekeepingTask.findFirst
      .mockResolvedValueOnce({
        id: 'task-1',
        branchId: 'branch-1',
        roomId: 'room-1',
        assignedToStaffId: 'staff-2',
        taskType: 'CHECKOUT_CLEAN',
        status: 'IN_PROGRESS',
        startedAt: new Date('2025-05-26T10:00:00.000Z'),
        completedAt: null,
      })
      .mockResolvedValueOnce(null);
    prismaService.housekeepingTask.update.mockResolvedValue({
      id: 'task-1',
      status: 'DONE',
      startedAt: new Date('2025-05-26T10:00:00.000Z'),
      completedAt: new Date('2025-05-26T10:30:00.000Z'),
    });
    prismaService.booking.findFirst.mockResolvedValue(null);
    prismaService.room.findFirst.mockResolvedValue({
      id: 'room-1',
      status: 'MAINTENANCE',
    });

    await service.updateStatus(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'BRANCH_MANAGER',
        staffId: 'staff-1',
        branchId: 'branch-1',
      },
      'task-1',
      {
        status: 'DONE',
      },
    );

    expect(prismaService.room.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { status: 'AVAILABLE' },
    });
    expect(auditService.logRoomStatusChange).toHaveBeenCalledWith({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      actorIp: undefined,
      roomId: 'room-1',
      fromStatus: 'MAINTENANCE',
      toStatus: 'AVAILABLE',
      source: 'housekeeping_checkout_clean_completed',
      housekeepingTaskId: 'task-1',
    });
  });

  it('extends next task list only within the assigned branch for managers', async () => {
    prismaService.housekeepingTask.findMany.mockResolvedValue([]);

    await service.findAll(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'BRANCH_MANAGER',
        staffId: 'staff-1',
        branchId: 'branch-1',
      },
      {
        date: '2025-05-26',
        branchId: 'branch-1',
      },
    );

    expect(prismaService.housekeepingTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: 'branch-1',
        }),
      }),
    );
  });
});
