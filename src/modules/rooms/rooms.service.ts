import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoomStatus } from '@prisma/client';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { QueryRoomsDto } from './dto/query-rooms.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, branchId: string, dto: CreateRoomDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const subscription = await this.prisma.subscription.findFirst({
      where: { organizationId, status: { in: ['ACTIVE', 'TRIALING'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    const roomCount = await this.prisma.room.count({
      where: { branchId, deletedAt: null },
    });

    if (
      subscription &&
      subscription.plan.maxRoomsPerBranch !== -1 &&
      roomCount >= subscription.plan.maxRoomsPerBranch
    ) {
      throw new ForbiddenException(
        `Your plan allows max ${subscription.plan.maxRoomsPerBranch} room(s) per branch. Please upgrade.`,
      );
    }

    return this.prisma.room.create({
      data: {
        branchId,
        name: dto.name,
        roomType: dto.roomType,
        capacity: dto.capacity,
        bedCount: dto.bedCount,
        bedType: dto.bedType,
        floorNumber: dto.floorNumber,
        roomAmenities: dto.roomAmenities ?? [],
        bufferHours: dto.bufferHours ?? undefined,
      },
      select: {
        id: true,
        name: true,
        roomType: true,
        capacity: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async findAll(organizationId: string, branchId: string, query: QueryRoomsDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const where: any = { branchId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.roomType) where.roomType = query.roomType;

    return this.prisma.room.findMany({
      where,
      include: {
        roomRates: {
          select: { id: true, label: true, durationHours: true, price: true, isActive: true },
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        roomImages: {
          select: { url: true },
          where: { isCover: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, branch: { organizationId }, deletedAt: null },
      include: {
        roomImages: {
          select: { id: true, url: true, isCover: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
        roomRates: {
          select: { id: true, label: true, durationHours: true, price: true, isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        branch: { select: { id: true, name: true } },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(id: string, organizationId: string, dto: UpdateRoomDto) {
    const room = await this.prisma.room.findFirst({
      where: { id, branch: { organizationId }, deletedAt: null },
    });
    if (!room) throw new NotFoundException('Room not found');

    return this.prisma.room.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        name: true,
        roomType: true,
        capacity: true,
        bedCount: true,
        bedType: true,
        floorNumber: true,
        roomAmenities: true,
        status: true,
        bufferHours: true,
      },
    });
  }

  async updateStatus(id: string, organizationId: string, dto: UpdateRoomStatusDto) {
    const room = await this.prisma.room.findFirst({
      where: { id, branch: { organizationId }, deletedAt: null },
    });
    if (!room) throw new NotFoundException('Room not found');

    if (dto.status === 'OCCUPIED') {
      throw new BadRequestException('OCCUPIED status is set automatically by the system');
    }

    return this.prisma.room.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, name: true, status: true },
    });
  }

  async remove(id: string, organizationId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, branch: { organizationId }, deletedAt: null },
    });
    if (!room) throw new NotFoundException('Room not found');

    await this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Room deleted' };
  }

  async checkAvailability(organizationId: string, branchId: string, checkIn: Date, checkOut: Date) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const rooms = await this.prisma.room.findMany({
      where: { branchId, deletedAt: null, status: { notIn: ['INACTIVE', 'MAINTENANCE'] } },
      select: { id: true, name: true, bufferHours: true },
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        roomId: { in: rooms.map(r => r.id) },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { roomId: true, checkIn: true, checkOut: true },
    });

    const bookedRoomIds = new Set(bookings.map(b => b.roomId));

    return rooms.map(room => {
      const isAvailable = !bookedRoomIds.has(room.id);
      const booking = bookings.find(b => b.roomId === room.id);
      return {
        id: room.id,
        name: room.name,
        isAvailable,
        nextAvailableAt: booking ? booking.checkOut.toISOString() : undefined,
      };
    });
  }
}
