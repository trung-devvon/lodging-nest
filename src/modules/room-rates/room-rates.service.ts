import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessContextService } from '../../common/services/access-context.service';
import { CreateRoomRateDto } from './dto/create-room-rate.dto';
import { UpdateRoomRateDto } from './dto/update-room-rate.dto';

@Injectable()
export class RoomRatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessContextService: AccessContextService,
  ) {}

  async create(
    organizationId: string,
    roomId: string,
    userId: string,
    role: string,
    dto: CreateRoomRateDto,
  ) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        branch: { organizationId, deletedAt: null },
        deletedAt: null,
      },
      select: { id: true, branchId: true },
    });
    if (!room) throw new NotFoundException('Room not found');

    await this.accessContextService.ensureBranchManagerAccessToBranch(
      userId,
      organizationId,
      role,
      room.branchId,
      'room rates',
    );

    return this.prisma.roomRate.create({
      data: {
        roomId,
        label: dto.label,
        durationHours: dto.durationHours,
        price: dto.price,
        sortOrder: dto.sortOrder ?? 0,
      },
      select: {
        id: true,
        label: true,
        durationHours: true,
        price: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  async findAll(organizationId: string, roomId: string) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        branch: { organizationId, deletedAt: null },
        deletedAt: null,
      },
    });
    if (!room) throw new NotFoundException('Room not found');

    return this.prisma.roomRate.findMany({
      where: { roomId },
      select: {
        id: true,
        label: true,
        durationHours: true,
        price: true,
        isActive: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    role: string,
    dto: UpdateRoomRateDto,
  ) {
    const rate = await this.prisma.roomRate.findFirst({
      where: {
        id,
        room: { deletedAt: null, branch: { organizationId, deletedAt: null } },
      },
      select: { id: true, room: { select: { branchId: true } } },
    });
    if (!rate) throw new NotFoundException('Room rate not found');

    await this.accessContextService.ensureBranchManagerAccessToBranch(
      userId,
      organizationId,
      role,
      rate.room.branchId,
      'room rates',
    );

    return this.prisma.roomRate.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        label: true,
        durationHours: true,
        price: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    const rate = await this.prisma.roomRate.findFirst({
      where: {
        id,
        room: { deletedAt: null, branch: { organizationId, deletedAt: null } },
      },
    });
    if (!rate) throw new NotFoundException('Room rate not found');

    await this.prisma.roomRate.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Room rate has been deactivated' };
  }
}
