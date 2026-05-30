import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { CreateHousekeepingDto, UpdateHousekeepingStatusDto, AssignHousekeepingDto, QueryHousekeepingDto } from './dto/housekeeping.dto';

@Injectable()
export class HousekeepingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchesService: BranchesService,
  ) {}

  async create(userId: string, dto: CreateHousekeepingDto) {
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
      include: { branch: true },
    });
    if (!room) throw new NotFoundException('Room not found');

    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (room.branch.organizationId !== orgId) {
      throw new ForbiddenException('Access denied');
    }

    const staff = await this.prisma.staff.findFirst({ where: { userId } });
    if (!staff) throw new NotFoundException('Staff profile not found');

    return this.prisma.housekeepingTask.create({
      data: {
        roomId: dto.roomId,
        bookingId: dto.bookingId,
        assignedToStaffId: dto.assignedToStaffId,
        assignedByStaffId: staff.id,
        branchId: room.branchId,
        taskType: dto.taskType,
        scheduledDate: new Date(dto.scheduledDate),
        scheduledTime: dto.scheduledTime,
        notes: dto.notes,
      },
      include: {
        room: { select: { id: true, name: true } },
        assignedToStaff: { select: { id: true, staffRole: true, user: { select: { id: true, email: true } } } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(userId: string, query: QueryHousekeepingDto) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new ForbiddenException('Access denied');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const staff = await this.prisma.staff.findFirst({ where: { userId } });

    const where: any = {};

    if (staff && user?.role === 'HOUSEKEEPER') {
      where.assignedToStaffId = staff.id;
    } else {
      const branches = await this.prisma.branch.findMany({
        where: { organizationId: orgId },
        select: { id: true },
      });
      where.branchId = { in: branches.map((b) => b.id) };
    }

    if (query.branchId) where.branchId = query.branchId;
    if (query.date) {
      const date = new Date(query.date);
      where.scheduledDate = date;
    }
    if (query.status) where.status = query.status;
    if (query.assignedToStaffId) where.assignedToStaffId = query.assignedToStaffId;

    return this.prisma.housekeepingTask.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
      include: {
        room: { select: { id: true, name: true } },
        assignedToStaff: { select: { id: true, staffRole: true, user: { select: { id: true, email: true } } } },
        assignedByStaff: { select: { id: true, staffRole: true, user: { select: { id: true, email: true } } } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async updateStatus(id: string, userId: string, dto: UpdateHousekeepingStatusDto) {
    const task = await this.prisma.housekeepingTask.findUnique({
      where: { id },
      include: { room: { include: { branch: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (task.room.branch.organizationId !== orgId) {
      throw new ForbiddenException('Access denied');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'HOUSEKEEPER') {
      const staff = await this.prisma.staff.findFirst({ where: { userId } });
      if (!staff || task.assignedToStaffId !== staff.id) {
        throw new ForbiddenException('You can only update your own tasks');
      }
    }

    const updateData: any = { status: dto.status };
    if (dto.status === 'IN_PROGRESS') updateData.startedAt = new Date();
    if (dto.status === 'DONE') updateData.completedAt = new Date();

    return this.prisma.housekeepingTask.update({
      where: { id },
      data: updateData,
      include: {
        room: { select: { id: true, name: true } },
        assignedToStaff: { select: { id: true, staffRole: true, user: { select: { id: true, email: true } } } },
      },
    });
  }

  async assign(id: string, userId: string, dto: AssignHousekeepingDto) {
    const task = await this.prisma.housekeepingTask.findUnique({
      where: { id },
      include: { room: { include: { branch: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (task.room.branch.organizationId !== orgId) {
      throw new ForbiddenException('Access denied');
    }

    const staffMember = await this.prisma.staff.findUnique({
      where: { id: dto.assignedToStaffId },
    });
    if (!staffMember) throw new NotFoundException('Staff not found');

    return this.prisma.housekeepingTask.update({
      where: { id },
      data: { assignedToStaffId: dto.assignedToStaffId },
      include: {
        room: { select: { id: true, name: true } },
        assignedToStaff: { select: { id: true, staffRole: true, user: { select: { id: true, email: true } } } },
      },
    });
  }
}
