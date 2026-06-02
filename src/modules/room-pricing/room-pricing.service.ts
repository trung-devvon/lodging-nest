import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PriceAdjustType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessContextService } from '../../common/services/access-context.service';
import {
  CreateRoomPricingDto,
  UpdateRoomPricingDto,
} from './dto/room-pricing.dto';
import { QueryRoomPricingDto } from './dto/query-room-pricing.dto';
import { toDecimal, toMoneyDecimal } from '../../common/utils/pricing.util';

@Injectable()
export class RoomPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessContextService: AccessContextService,
  ) {}

  async create(
    organizationId: string,
    roomId: string,
    userId: string,
    role: string,
    dto: CreateRoomPricingDto,
  ) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        branch: { organizationId, deletedAt: null },
        deletedAt: null,
      },
      select: { id: true, name: true, branchId: true },
    });
    if (!room) throw new NotFoundException('Room not found');

    await this.accessContextService.ensureBranchManagerAccessToBranch(
      userId,
      organizationId,
      role,
      room.branchId,
      'room pricing',
    );

    const rate = await this.resolveScopedRate(roomId, dto.rateId);
    const { startDate, endDate } = this.parseAndValidateDateRange(
      dto.startDate,
      dto.endDate,
    );

    this.validateAdjustPayload(dto.priceAdjustType, dto.overridePrice);

    const overlapping = await this.findOverlappingRule(
      roomId,
      rate?.id ?? null,
      startDate,
      endDate,
    );
    if (overlapping) {
      throw new ConflictException(this.buildOverlapMessage(overlapping));
    }

    return this.prisma.roomPricing.create({
      data: {
        roomId,
        rateId: rate?.id ?? null,
        label: dto.label,
        startDate,
        endDate,
        priceAdjustType: dto.priceAdjustType,
        adjustValue: toMoneyDecimal(dto.adjustValue) ?? new Prisma.Decimal(0),
        overridePrice:
          toMoneyDecimal(dto.overridePrice ?? 0) ?? new Prisma.Decimal(0),
      },
      include: {
        room: { select: { id: true, name: true } },
        rate: { select: { id: true, label: true } },
      },
    });
  }

  async findAll(
    organizationId: string,
    roomId: string,
    query: QueryRoomPricingDto,
  ) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        branch: { organizationId, deletedAt: null },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!room) throw new NotFoundException('Room not found');

    const where: Prisma.RoomPricingWhereInput = { roomId };
    const fromDate = query.from
      ? this.parseDateOnly(query.from, 'from')
      : undefined;
    const toDate = query.to ? this.parseDateOnly(query.to, 'to') : undefined;

    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException('from must be earlier than or equal to to');
    }

    if (fromDate) {
      where.endDate = { gte: fromDate };
    }
    if (toDate) {
      where.startDate = { lte: toDate };
    }

    return this.prisma.roomPricing.findMany({
      where,
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        room: { select: { id: true, name: true } },
        rate: { select: { id: true, label: true } },
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    role: string,
    dto: UpdateRoomPricingDto,
  ) {
    const pricing = await this.prisma.roomPricing.findFirst({
      where: {
        id,
        room: { branch: { organizationId, deletedAt: null }, deletedAt: null },
      },
      include: {
        room: { select: { id: true, branchId: true } },
        rate: { select: { id: true } },
      },
    });
    if (!pricing) throw new NotFoundException('Pricing rule not found');

    await this.accessContextService.ensureBranchManagerAccessToBranch(
      userId,
      organizationId,
      role,
      pricing.room.branchId,
      'room pricing',
    );

    const nextRateId =
      dto.rateId !== undefined
        ? ((await this.resolveScopedRate(pricing.roomId, dto.rateId))?.id ??
          null)
        : (pricing.rate?.id ?? null);

    const startDate = dto.startDate
      ? this.parseDateOnly(dto.startDate, 'startDate')
      : pricing.startDate;
    const endDate = dto.endDate
      ? this.parseDateOnly(dto.endDate, 'endDate')
      : pricing.endDate;

    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate must be earlier than or equal to endDate',
      );
    }

    const nextAdjustType = dto.priceAdjustType ?? pricing.priceAdjustType;
    const nextOverridePrice =
      dto.overridePrice !== undefined
        ? toDecimal(dto.overridePrice)
        : pricing.overridePrice;
    this.validateAdjustPayload(nextAdjustType, nextOverridePrice);

    const nextAdjustValue =
      dto.adjustValue !== undefined
        ? toMoneyDecimal(dto.adjustValue)
        : undefined;
    const nextOverrideMoney =
      dto.overridePrice !== undefined
        ? toMoneyDecimal(dto.overridePrice)
        : undefined;

    const updateData: Prisma.RoomPricingUncheckedUpdateInput = {
      ...dto,
      rateId: nextRateId,
      startDate,
      endDate,
      adjustValue: nextAdjustValue ?? undefined,
      overridePrice: nextOverrideMoney ?? undefined,
    };

    const overlapping = await this.findOverlappingRule(
      pricing.roomId,
      nextRateId,
      startDate,
      endDate,
      id,
    );
    if (overlapping) {
      throw new ConflictException(this.buildOverlapMessage(overlapping));
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

  async remove(id: string, organizationId: string) {
    const pricing = await this.prisma.roomPricing.findFirst({
      where: {
        id,
        room: { branch: { organizationId, deletedAt: null }, deletedAt: null },
      },
      select: { id: true },
    });
    if (!pricing) throw new NotFoundException('Pricing rule not found');

    await this.prisma.roomPricing.delete({ where: { id } });
    return { message: 'Pricing rule deleted' };
  }

  private parseAndValidateDateRange(startDateRaw: string, endDateRaw: string) {
    const startDate = this.parseDateOnly(startDateRaw, 'startDate');
    const endDate = this.parseDateOnly(endDateRaw, 'endDate');

    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate must be earlier than or equal to endDate',
      );
    }

    return { startDate, endDate };
  }

  private parseDateOnly(
    raw: string,
    field: 'startDate' | 'endDate' | 'from' | 'to',
  ) {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date string`);
    }
    return parsed;
  }

  private validateAdjustPayload(
    priceAdjustType: PriceAdjustType,
    overridePrice?: Prisma.Decimal | number | string | null,
  ) {
    const normalizedOverride = toDecimal(overridePrice);
    if (priceAdjustType === 'FIXED' && normalizedOverride == null) {
      throw new BadRequestException(
        'overridePrice is required when priceAdjustType is FIXED',
      );
    }
  }

  private async resolveScopedRate(roomId: string, rateId?: string | null) {
    if (rateId == null) return null;

    const rate = await this.prisma.roomRate.findFirst({
      where: { id: rateId, roomId },
      select: { id: true, label: true },
    });
    if (!rate) {
      throw new BadRequestException('rateId must belong to the same room');
    }

    return rate;
  }

  private async findOverlappingRule(
    roomId: string,
    rateId: string | null,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ) {
    const where: Prisma.RoomPricingWhereInput = {
      roomId,
      isActive: true,
      id: excludeId ? { not: excludeId } : undefined,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      rateId: rateId,
    };

    return this.prisma.roomPricing.findFirst({
      where,
      select: {
        id: true,
        label: true,
        startDate: true,
        endDate: true,
      },
    });
  }

  private buildOverlapMessage(overlapping: {
    id: string;
    label: string | null;
    startDate: Date;
    endDate: Date;
  }) {
    return `Date range overlaps with existing pricing rule "${overlapping.label ?? overlapping.id}" (${overlapping.startDate.toISOString().split('T')[0]} to ${overlapping.endDate.toISOString().split('T')[0]})`;
  }
}
