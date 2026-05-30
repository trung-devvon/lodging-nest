import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomRateDto } from './dto/create-room-rate.dto';
import { UpdateRoomRateDto } from './dto/update-room-rate.dto';

@Injectable()
export class RoomRatesService {
  constructor(private readonly prisma: PrismaService) {}

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

    await this.ensureBranchManagerAccessToBranch(
      userId,
      organizationId,
      role,
      room.branchId,
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

    await this.ensureBranchManagerAccessToBranch(
      userId,
      organizationId,
      role,
      rate.room.branchId,
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

    const [bookingCount, pricingCount] = await Promise.all([
      this.prisma.booking.count({ where: { rateId: id } }),
      this.prisma.roomPricing.count({ where: { rateId: id } }),
    ]);

    if (bookingCount > 0) {
      throw new BadRequestException(
        'Cannot delete room rate because it is referenced by existing bookings',
      );
    }

    if (pricingCount > 0) {
      throw new BadRequestException(
        'Cannot delete room rate because it is referenced by room pricing rules',
      );
    }

    await this.prisma.roomRate.delete({ where: { id } });
    return { message: 'Room rate deleted' };
  }

  private async ensureBranchManagerAccessToBranch(
    userId: string,
    organizationId: string,
    role: string,
    branchId: string,
  ) {
    if (role !== 'BRANCH_MANAGER') return;

    const staff = await this.prisma.staff.findFirst({
      where: {
        userId,
        organizationId,
        isActive: true,
      },
      select: { branchId: true },
    });

    if (!staff?.branchId || staff.branchId !== branchId) {
      throw new ForbiddenException(
        'You can only manage room rates in your assigned branch',
      );
    }
  }
}
