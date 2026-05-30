import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomRateDto } from './dto/create-room-rate.dto';
import { UpdateRoomRateDto } from './dto/update-room-rate.dto';

@Injectable()
export class RoomRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, roomId: string, dto: CreateRoomRateDto) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, branch: { organizationId }, deletedAt: null },
    });
    if (!room) throw new NotFoundException('Room not found');

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
      where: { id: roomId, branch: { organizationId }, deletedAt: null },
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
      orderBy: { sortOrder: 'asc' },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateRoomRateDto) {
    const rate = await this.prisma.roomRate.findFirst({
      where: { id, room: { branch: { organizationId } } },
    });
    if (!rate) throw new NotFoundException('Room rate not found');

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
      where: { id, room: { branch: { organizationId } } },
    });
    if (!rate) throw new NotFoundException('Room rate not found');

    await this.prisma.roomRate.delete({ where: { id } });
    return { message: 'Room rate deleted' };
  }
}
