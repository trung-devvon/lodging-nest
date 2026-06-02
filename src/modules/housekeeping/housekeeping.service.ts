import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HousekeepingDispatchService } from '../../common/services/housekeeping-dispatch.service';
import { RoomStatus, TaskStatus, TaskType } from '@prisma/client';
import { HousekeepingActorContext } from './housekeeping-actor-context.interface';
import {
  CreateHousekeepingDto,
  UpdateHousekeepingStatusDto,
  AssignHousekeepingDto,
  QueryHousekeepingDto,
} from './dto/housekeeping.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class HousekeepingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly housekeepingDispatchService: HousekeepingDispatchService,
    private readonly auditService: AuditService,
  ) {}

  async create(actor: HousekeepingActorContext, dto: CreateHousekeepingDto) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: dto.roomId,
        deletedAt: null,
        branch: { organizationId: actor.organizationId, deletedAt: null },
      },
      select: {
        id: true,
        branchId: true,
      },
    });
    if (!room) throw new NotFoundException('Room not found');

    this.assertBranchAccess(actor, room.branchId, 'housekeeping tasks', [
      'BRANCH_MANAGER',
    ]);

    if (!actor.staffId) {
      throw new ForbiddenException('Active staff record not found');
    }

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: {
          id: dto.bookingId,
          roomId: dto.roomId,
          room: {
            branch: { organizationId: actor.organizationId, deletedAt: null },
            deletedAt: null,
          },
        },
        select: { id: true },
      });
      if (!booking) {
        throw new BadRequestException('Booking does not belong to this room');
      }
    }

    const assignedToStaffId =
      dto.assignedToStaffId ??
      (dto.taskType === TaskType.CHECKOUT_CLEAN
        ? (
            await this.housekeepingDispatchService.findBestHousekeeper(
              room.branchId,
            )
          )?.id
        : undefined);

    await this.ensureAssignedHousekeeper(
      assignedToStaffId,
      actor.organizationId,
      room.branchId,
    );

    const task = await this.prisma.housekeepingTask.create({
      data: {
        roomId: dto.roomId,
        bookingId: dto.bookingId,
        assignedToStaffId,
        assignedByStaffId: actor.staffId,
        branchId: room.branchId,
        taskType: dto.taskType,
        scheduledDate: new Date(dto.scheduledDate),
        scheduledTime: dto.scheduledTime,
        notes: dto.notes,
      },
      select: this.taskDetailSelect(),
    });

    if (dto.taskType === TaskType.CHECKOUT_CLEAN) {
      await this.markRoomPendingCleaning(dto.roomId, {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        actorIp: actor.actorIp,
      });
    }

    return this.mapTaskDetail(task);
  }

  async findAll(actor: HousekeepingActorContext, query: QueryHousekeepingDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = {};

    if (actor.role === 'HOUSEKEEPER') {
      if (
        query.assignedToStaffId &&
        query.assignedToStaffId !== actor.staffId
      ) {
        throw new ForbiddenException(
          'You can only access your own housekeeping tasks',
        );
      }
      if (query.branchId && query.branchId !== actor.branchId) {
        throw new ForbiddenException(
          'You can only access housekeeping tasks in your assigned branch',
        );
      }
      where.assignedToStaffId = actor.staffId;
    }

    const scopedBranchId = this.resolveScopedBranchId(actor, query.branchId);
    if (scopedBranchId) {
      where.branchId = scopedBranchId;
    }

    if (query.date) {
      where.scheduledDate = new Date(query.date);
    }
    if (query.status) where.status = query.status;
    if (query.assignedToStaffId)
      where.assignedToStaffId = query.assignedToStaffId;

    const tasks = await this.prisma.housekeepingTask.findMany({
      where,
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
      select: this.taskDetailSelect(),
    });

    const prioritizedTasks =
      this.housekeepingDispatchService.sortTasksByPriority(tasks);
    const total = prioritizedTasks.length;
    const start = (page - 1) * limit;

    return {
      data: prioritizedTasks
        .slice(start, start + limit)
        .map((task) => this.mapTaskDetail(task)),
      meta: { total, page, limit },
    };
  }

  async updateStatus(
    actor: HousekeepingActorContext,
    id: string,
    dto: UpdateHousekeepingStatusDto,
  ) {
    const task = await this.prisma.housekeepingTask.findFirst({
      where: {
        id,
        branch: { organizationId: actor.organizationId },
      },
      select: {
        id: true,
        branchId: true,
        assignedToStaffId: true,
        roomId: true,
        taskType: true,
        status: true,
        startedAt: true,
        completedAt: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    this.assertBranchAccess(actor, task.branchId, 'housekeeping tasks', [
      'BRANCH_MANAGER',
      'HOUSEKEEPER',
    ]);

    if (
      actor.role === 'HOUSEKEEPER' &&
      task.assignedToStaffId !== actor.staffId
    ) {
      throw new ForbiddenException(
        'You can only update your own housekeeping tasks',
      );
    }

    this.assertValidStatusTransition(task.status, dto.status);

    const now = new Date();
    const updateData: Record<string, unknown> = { status: dto.status };
    if (dto.status === TaskStatus.IN_PROGRESS) {
      updateData.startedAt = task.startedAt ?? now;
      updateData.completedAt = null;
    }
    if (dto.status === TaskStatus.DONE) {
      updateData.startedAt = task.startedAt ?? now;
      updateData.completedAt = now;
    }

    const updatedTask = await this.prisma.housekeepingTask.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (
      dto.status === TaskStatus.DONE &&
      task.taskType === TaskType.CHECKOUT_CLEAN
    ) {
      await this.releaseRoomIfCleaningCompleted(task.roomId, task.id, {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        actorIp: actor.actorIp,
        housekeepingTaskId: task.id,
      });
    }

    return updatedTask;
  }

  async assign(
    actor: HousekeepingActorContext,
    id: string,
    dto: AssignHousekeepingDto,
  ) {
    const task = await this.prisma.housekeepingTask.findFirst({
      where: {
        id,
        branch: { organizationId: actor.organizationId },
      },
      select: {
        id: true,
        branchId: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    this.assertBranchAccess(actor, task.branchId, 'housekeeping tasks', [
      'BRANCH_MANAGER',
    ]);
    await this.ensureAssignedHousekeeper(
      dto.assignedToStaffId,
      actor.organizationId,
      task.branchId,
    );

    const updatedTask = await this.prisma.housekeepingTask.update({
      where: { id },
      data: { assignedToStaffId: dto.assignedToStaffId },
      select: {
        id: true,
        assignedToStaff: {
          select: {
            id: true,
            position: true,
            user: { select: { email: true, phone: true } },
          },
        },
      },
    });

    const { assignedToStaff, ...rest } = updatedTask;
    return {
      ...rest,
      assignedTo: assignedToStaff,
    };
  }

  private async ensureAssignedHousekeeper(
    staffId: string | undefined,
    organizationId: string,
    branchId: string,
  ) {
    if (!staffId) return;

    const staff = await this.prisma.staff.findFirst({
      where: {
        id: staffId,
        organizationId,
        branchId,
        isActive: true,
        staffRole: 'HOUSEKEEPER',
      },
      select: { id: true },
    });

    if (!staff) {
      throw new BadRequestException(
        'assignedToStaffId must be an active housekeeper in the same branch',
      );
    }
  }

  private resolveScopedBranchId(
    actor: HousekeepingActorContext,
    requestedBranchId?: string,
  ) {
    if (actor.role !== 'BRANCH_MANAGER' && actor.role !== 'HOUSEKEEPER') {
      return requestedBranchId;
    }

    if (!actor.branchId) {
      throw new ForbiddenException(
        'Active staff record is not assigned to a branch',
      );
    }

    if (requestedBranchId && requestedBranchId !== actor.branchId) {
      throw new ForbiddenException(
        'You can only access housekeeping tasks in your assigned branch',
      );
    }

    return actor.branchId;
  }

  private assertBranchAccess(
    actor: HousekeepingActorContext,
    branchId: string,
    resourceLabel: string,
    scopedRoles = ['BRANCH_MANAGER', 'HOUSEKEEPER'],
  ) {
    if (!scopedRoles.includes(actor.role)) return;

    if (!actor.branchId) {
      throw new ForbiddenException(
        'Active staff record is not assigned to a branch',
      );
    }

    if (actor.branchId !== branchId) {
      throw new ForbiddenException(
        `You can only manage ${resourceLabel} in your assigned branch`,
      );
    }
  }

  private assertValidStatusTransition(
    currentStatus: TaskStatus,
    nextStatus: TaskStatus,
  ) {
    if (currentStatus === nextStatus) {
      throw new BadRequestException('Task is already in this status');
    }

    const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
      PENDING: [TaskStatus.IN_PROGRESS, TaskStatus.DONE],
      IN_PROGRESS: [TaskStatus.DONE],
      DONE: [],
      SKIPPED: [],
    };

    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(
        `Cannot change housekeeping task status from ${currentStatus} to ${nextStatus}`,
      );
    }
  }

  private taskDetailSelect() {
    return {
      id: true,
      taskType: true,
      scheduledDate: true,
      scheduledTime: true,
      status: true,
      notes: true,
      room: {
        select: {
          id: true,
          name: true,
          floorNumber: true,
        },
      },
      assignedToStaff: {
        select: {
          id: true,
          position: true,
          user: {
            select: {
              email: true,
              phone: true,
            },
          },
        },
      },
      assignedByStaff: {
        select: {
          id: true,
          position: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    } as const;
  }

  private mapTaskDetail<
    T extends {
      taskType: TaskType;
      status: TaskStatus;
      assignedToStaff: unknown;
      assignedByStaff: unknown;
    },
  >(task: T) {
    const { assignedToStaff, assignedByStaff, ...rest } = task;
    return {
      ...rest,
      priority: this.housekeepingDispatchService.getTaskPriority(
        task.taskType,
        task.status,
      ),
      assignedTo: assignedToStaff,
      assignedBy: assignedByStaff,
    };
  }

  private async markRoomPendingCleaning(
    roomId: string,
    auditContext?: {
      organizationId: string;
      actorUserId?: string;
      actorIp?: string;
    },
  ) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!room) return;
    if (
      room.status === RoomStatus.INACTIVE ||
      room.status === RoomStatus.OCCUPIED ||
      room.status === RoomStatus.MAINTENANCE
    ) {
      return;
    }

    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.MAINTENANCE },
    });

    if (auditContext) {
      await this.auditService.logRoomStatusChange({
        organizationId: auditContext.organizationId,
        actorUserId: auditContext.actorUserId,
        actorIp: auditContext.actorIp,
        roomId,
        fromStatus: room.status,
        toStatus: RoomStatus.MAINTENANCE,
        source: 'housekeeping_checkout_clean',
      });
    }
  }

  private async releaseRoomIfCleaningCompleted(
    roomId: string,
    currentTaskId: string,
    auditContext?: {
      organizationId: string;
      actorUserId?: string;
      actorIp?: string;
      housekeepingTaskId?: string;
    },
  ) {
    const [openCleaningTask, checkedInBooking, room] = await Promise.all([
      this.prisma.housekeepingTask.findFirst({
        where: {
          roomId,
          id: { not: currentTaskId },
          status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        },
        select: { id: true },
      }),
      this.prisma.booking.findFirst({
        where: {
          roomId,
          status: 'CHECKED_IN',
        },
        select: { id: true },
      }),
      this.prisma.room.findFirst({
        where: { id: roomId, deletedAt: null },
        select: { id: true, status: true },
      }),
    ]);

    if (!room || openCleaningTask || checkedInBooking) {
      return;
    }

    if (room.status === RoomStatus.MAINTENANCE) {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.AVAILABLE },
      });
      if (auditContext) {
        await this.auditService.logRoomStatusChange({
          organizationId: auditContext.organizationId,
          actorUserId: auditContext.actorUserId,
          actorIp: auditContext.actorIp,
          roomId,
          fromStatus: room.status,
          toStatus: RoomStatus.AVAILABLE,
          source: 'housekeeping_checkout_clean_completed',
          housekeepingTaskId: auditContext.housekeepingTaskId,
        });
      }
    }
  }
}
