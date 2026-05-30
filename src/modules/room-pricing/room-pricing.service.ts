import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BranchesService } from '../branches/branches.service';
import { CreateRoomPricingDto, UpdateRoomPricingDto } from './dto/room-pricing.dto';

@Injectable()
export class RoomPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchesService: BranchesService,
  ) {}

  async create(roomId: string, userId: string, dto: CreateRoomPricingDto) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { branch: true },
    });
    if (!room) throw new NotFoundException('Room not found');

    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (room.branch.organizationId !== orgId) {
      throw new ForbiddenException('Access denied');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (startDate >= endDate) {
      throw new ConflictException('startDate must be before endDate');
    }

    const overlapping = await this.prisma.roomPricing.findFirst({
      where: {
        roomId,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });
    if (overlapping) {
      throw new ConflictException(
        `Date range overlaps with existing pricing rule "${overlapping.label ?? overlapping.id}" (${overlapping.startDate.toISOString().split('T')[0]} to ${overlapping.endDate.toISOString().split('T')[0]})`,
      );
    }

    return this.prisma.roomPricing.create({
      data: {
        roomId,
        rateId: dto.rateId,
        label: dto.label,
        startDate,
        endDate,
        priceAdjustType: dto.priceAdjustType,
        adjustValue: dto.adjustValue,
        overridePrice: dto.overridePrice ?? 0,
      },
      include: { room: { select: { id: true, name: true } }, rate: { select: { id: true, label: true } } },
    });
  }

  async findAll(roomId: string, userId: string, from?: string, to?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { branch: true },
    });
    if (!room) throw new NotFoundException('Room not found');

    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (room.branch.organizationId !== orgId) {
      throw new ForbiddenException('Access denied');
    }

    const where: any = { roomId };
    if (from || to) {
      where.OR = [
        { startDate: { gte: from ? new Date(from) : undefined } },
        { endDate: { lte: to ? new Date(to) : undefined } },
      ].filter(Boolean);
    }

    return this.prisma.roomPricing.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        room: { select: { id: true, name: true } },
        rate: { select: { id: true, label: true } },
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateRoomPricingDto) {
    const pricing = await this.prisma.roomPricing.findUnique({
      where: { id },
      include: { room: { include: { branch: true } } },
    });
    if (!pricing) throw new NotFoundException('Pricing rule not found');

    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (pricing.room.branch.organizationId !== orgId) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: any = { ...dto };
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    const newStart = updateData.startDate ?? pricing.startDate;
    const newEnd = updateData.endDate ?? pricing.endDate;
    if (newStart >= newEnd) {
      throw new ConflictException('startDate must be before endDate');
    }

    const overlapping = await this.prisma.roomPricing.findFirst({
      where: {
        roomId: pricing.roomId,
        id: { not: id },
        startDate: { lt: newEnd },
        endDate: { gt: newStart },
      },
    });
    if (overlapping) {
      throw new ConflictException(
        `Date range overlaps with existing pricing rule "${overlapping.label ?? overlapping.id}" (${overlapping.startDate.toISOString().split('T')[0]} to ${overlapping.endDate.toISOString().split('T')[0]})`,
      );
    }

    return this.prisma.roomPricing.update({
      where: { id },
      data: updateData,
      include: {
        room: { select: { id: true, name: true } },
        rate: { select: { id: true, label: true } },
      },
    });
  }

  async remove(id: string, userId: string) {
    const pricing = await this.prisma.roomPricing.findUnique({
      where: { id },
      include: { room: { include: { branch: true } } },
    });
    if (!pricing) throw new NotFoundException('Pricing rule not found');

    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (pricing.room.branch.organizationId !== orgId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.roomPricing.delete({ where: { id } });
    return { message: 'Pricing rule deleted' };
  }
}
