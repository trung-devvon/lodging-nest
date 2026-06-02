import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { HousekeepingDispatchService } from '../../common/services/housekeeping-dispatch.service';
import { OccupancyService } from '../../common/services/occupancy.service';
import {
  calculatePrice,
  toMoneyDecimal,
} from '../../common/utils/pricing.util';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingPriceDto } from './dto/update-booking-price.dto';
import { BookingActorContext } from './booking-actor-context.interface';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_TARGET_TABLES } from '../audit/audit.constants';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly occupancyService: OccupancyService,
    private readonly housekeepingDispatchService: HousekeepingDispatchService,
    private readonly auditService: AuditService,
  ) {}

  async create(actor: BookingActorContext, dto: CreateBookingDto) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: dto.roomId,
        branch: { organizationId: actor.organizationId, deletedAt: null },
        deletedAt: null,
      },
      select: {
        id: true,
        branchId: true,
        bufferHours: true,
        branch: { select: { bufferHours: true } },
      },
    });
    if (!room) throw new NotFoundException('Room not found');

    this.assertBranchAccess(actor, room.branchId, 'bookings');

    const rate = await this.prisma.roomRate.findFirst({
      where: { id: dto.rateId, roomId: dto.roomId, isActive: true },
      select: { id: true, label: true, price: true },
    });
    if (!rate) throw new BadRequestException('Invalid or inactive rate');

    const guestProfile = await this.prisma.guestProfile.findFirst({
      where: { id: dto.guestProfileId, organizationId: actor.organizationId },
      select: { id: true },
    });
    if (!guestProfile) {
      throw new BadRequestException(
        'Guest profile does not belong to this organization',
      );
    }

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkIn >= checkOut)
      throw new BadRequestException('Check-in must be before check-out');

    const bufferHours = this.occupancyService.getBufferHours(
      room.bufferHours,
      room.branch.bufferHours,
    );
    const checkOutWithBuffer = this.occupancyService.getOccupiedUntil(
      { checkOut },
      bufferHours,
    );

    const conflictCandidates = await this.prisma.booking.findMany({
      where: {
        roomId: dto.roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: checkOutWithBuffer },
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        actualCheckOut: true,
      },
      orderBy: { checkIn: 'asc' },
    });
    const conflict = this.occupancyService.findFirstConflict(
      conflictCandidates,
      checkIn,
      checkOut,
      bufferHours,
    );
    if (conflict) {
      throw new ConflictException({
        code: 'ROOM_NOT_AVAILABLE',
        message: 'Room is already booked for this time period',
      });
    }

    const bookingCode = await this.generateBookingCode();

    const basePrice = toMoneyDecimal(rate.price) as Prisma.Decimal;
    const checkInDate = new Date(checkIn);
    checkInDate.setUTCHours(0, 0, 0, 0);

    const applicablePricingRules = await this.prisma.roomPricing.findMany({
      where: {
        roomId: dto.roomId,
        isActive: true,
        startDate: { lte: checkInDate },
        endDate: { gte: checkInDate },
        OR: [{ rateId: dto.rateId }, { rateId: null }],
      },
      select: {
        rateId: true,
        priceAdjustType: true,
        adjustValue: true,
        overridePrice: true,
      },
    });

    const pricing =
      applicablePricingRules.find((rule) => rule.rateId === dto.rateId) ??
      applicablePricingRules.find((rule) => rule.rateId === null);
    const finalPrice = pricing
      ? calculatePrice(
          basePrice,
          pricing.priceAdjustType,
          pricing.adjustValue,
          pricing.overridePrice,
        )
      : basePrice;

    const depositAmount =
      dto.depositAmount !== undefined
        ? toMoneyDecimal(dto.depositAmount)
        : new Prisma.Decimal(0);

    const createdBooking = await this.prisma.booking.create({
      data: {
        bookingCode,
        guestProfileId: dto.guestProfileId,
        roomId: dto.roomId,
        createdByStaffId: actor.staffId,
        checkIn,
        checkOut,
        rateId: dto.rateId,
        basePrice,
        finalPrice,
        depositAmount,
        numAdults: dto.numAdults,
        numChildren: dto.numChildren ?? 0,
        note: dto.note,
        source: dto.source,
        status: 'CONFIRMED',
      },
      include: {
        room: { select: { id: true, name: true } },
        guestProfile: { select: { id: true, fullName: true, phone: true } },
        rate: { select: { label: true } },
      },
    });

    const {
      guestProfile: guest,
      rate: createdRate,
      ...booking
    } = createdBooking;

    await this.auditService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorIp: actor.actorIp,
      action: AUDIT_ACTIONS.BOOKING_CREATED,
      targetTable: AUDIT_TARGET_TABLES.BOOKINGS,
      targetId: createdBooking.id,
      newValue: {
        bookingCode: createdBooking.bookingCode,
        roomId: createdBooking.roomId,
        guestProfileId: createdBooking.guestProfileId,
        rateId: createdBooking.rateId,
        checkIn: createdBooking.checkIn,
        checkOut: createdBooking.checkOut,
        status: createdBooking.status,
        basePrice: createdBooking.basePrice,
        finalPrice: createdBooking.finalPrice,
        depositAmount: createdBooking.depositAmount,
        source: createdBooking.source,
      },
    });

    return {
      ...booking,
      guest,
      rateLabel: createdRate.label,
      ...this.buildPriceSummary(finalPrice, []),
    };
  }

  async findAll(actor: BookingActorContext, query: QueryBookingsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const scopedBranchId = this.resolveScopedBranchId(actor, query.branchId);

    const where: Prisma.BookingWhereInput = {
      room: {
        deletedAt: null,
        branch: { organizationId: actor.organizationId, deletedAt: null },
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
    };

    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { bookingCode: { contains: query.search, mode: 'insensitive' } },
        {
          guestProfile: {
            fullName: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }
    if (query.date) {
      const date = new Date(query.date);
      where.checkIn = { gte: date };
      where.checkIn = {
        ...where.checkIn,
        lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          bookingCode: true,
          guestProfile: { select: { fullName: true, phone: true } },
          room: { select: { name: true } },
          checkIn: true,
          checkOut: true,
          finalPrice: true,
          depositAmount: true,
          status: true,
          source: true,
          extensions: {
            select: { extraPrice: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: data.map(({ guestProfile: guest, extensions, ...booking }) => ({
        ...booking,
        guest,
        ...this.buildPriceSummary(booking.finalPrice, extensions),
      })),
      meta: { total, page, limit },
    };
  }

  async findOne(id: string, actor: BookingActorContext) {
    const scopedBranchId = this.resolveScopedBranchId(actor);

    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        room: {
          deletedAt: null,
          branch: { organizationId: actor.organizationId, deletedAt: null },
          ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        },
      },
      include: {
        guestProfile: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
        room: {
          select: {
            id: true,
            name: true,
            branch: { select: { name: true } },
          },
        },
        createdByStaff: {
          select: { id: true, position: true },
        },
        rate: {
          select: { label: true },
        },
        extensions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const { guestProfile: guest, rate, ...rest } = booking;
    return {
      ...rest,
      guest,
      rateLabel: rate.label,
      ...this.buildPriceSummary(booking.finalPrice, booking.extensions),
    };
  }

  async updateStatus(
    id: string,
    actor: BookingActorContext,
    dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        room: {
          deletedAt: null,
          branch: { organizationId: actor.organizationId, deletedAt: null },
        },
      },
      include: {
        room: {
          select: {
            id: true,
            branchId: true,
            status: true,
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    this.assertBranchAccess(actor, booking.room.branchId, 'bookings');

    if (actor.role === 'RECEPTIONIST' && dto.status === 'CANCELLED') {
      throw new ForbiddenException('Receptionists cannot cancel bookings');
    }

    this.assertValidStatusTransition(booking.status, dto.status);

    if (dto.status === 'CANCELLED' && !dto.cancelReason?.trim()) {
      throw new BadRequestException(
        'cancelReason is required when cancelling a booking',
      );
    }

    const data: Prisma.BookingUncheckedUpdateInput = { status: dto.status };

    if (dto.status === 'CHECKED_OUT') {
      data.actualCheckOut = dto.actualCheckOut
        ? new Date(dto.actualCheckOut)
        : new Date();
    }

    if (dto.status === 'CANCELLED') {
      const cancelReason = dto.cancelReason?.trim();
      data.cancelledAt = new Date();
      data.cancelledByUserId = actor.userId;
      data.cancelReason = cancelReason;
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data,
      select: {
        id: true,
        bookingCode: true,
        status: true,
        actualCheckOut: true,
        cancelledAt: true,
        cancelReason: true,
      },
    });

    await this.auditService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorIp: actor.actorIp,
      action:
        dto.status === 'CANCELLED'
          ? AUDIT_ACTIONS.BOOKING_CANCELLED
          : AUDIT_ACTIONS.BOOKING_STATUS_CHANGED,
      targetTable: AUDIT_TARGET_TABLES.BOOKINGS,
      targetId: booking.id,
      oldValue: {
        status: booking.status,
      },
      newValue: {
        status: updated.status,
        actualCheckOut: updated.actualCheckOut,
        cancelledAt: updated.cancelledAt,
        cancelReason: updated.cancelReason,
      },
    });

    if (dto.status === 'CHECKED_IN' && booking.room.status !== 'OCCUPIED') {
      await this.prisma.room.update({
        where: { id: booking.roomId },
        data: { status: 'OCCUPIED' },
      });
      await this.auditService.logRoomStatusChange({
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        actorIp: actor.actorIp,
        roomId: booking.roomId,
        fromStatus: booking.room.status,
        toStatus: 'OCCUPIED',
        source: 'booking_status_update',
        bookingId: booking.id,
      });
    }

    if (dto.status === 'CHECKED_OUT' || dto.status === 'CANCELLED') {
      const hasCheckedIn = await this.prisma.booking.findFirst({
        where: {
          roomId: booking.roomId,
          status: 'CHECKED_IN',
          id: { not: id },
        },
      });
      if (
        !hasCheckedIn &&
        dto.status === 'CANCELLED' &&
        booking.room.status !== 'AVAILABLE'
      ) {
        await this.prisma.room.update({
          where: { id: booking.roomId },
          data: { status: 'AVAILABLE' },
        });
        await this.auditService.logRoomStatusChange({
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          actorIp: actor.actorIp,
          roomId: booking.roomId,
          fromStatus: booking.room.status,
          toStatus: 'AVAILABLE',
          source: 'booking_status_update',
          bookingId: booking.id,
        });
      }
      if (
        !hasCheckedIn &&
        dto.status === 'CHECKED_OUT' &&
        booking.room.status !== 'MAINTENANCE'
      ) {
        await this.prisma.room.update({
          where: { id: booking.roomId },
          data: { status: 'MAINTENANCE' },
        });
        await this.auditService.logRoomStatusChange({
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          actorIp: actor.actorIp,
          roomId: booking.roomId,
          fromStatus: booking.room.status,
          toStatus: 'MAINTENANCE',
          source: 'booking_status_update',
          bookingId: booking.id,
        });
      }
    }

    if (dto.status === 'CHECKED_OUT') {
      await this.ensureCheckoutCleaningTask(
        {
          id: booking.id,
          roomId: booking.roomId,
          room: { branchId: booking.room.branchId },
          actualCheckOut: updated.actualCheckOut,
        },
        actor.staffId,
      );
    }

    return updated;
  }

  async updatePrice(
    id: string,
    actor: BookingActorContext,
    dto: UpdateBookingPriceDto,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        room: {
          deletedAt: null,
          branch: { organizationId: actor.organizationId, deletedAt: null },
        },
      },
      select: {
        id: true,
        bookingCode: true,
        finalPrice: true,
        priceNote: true,
        room: {
          select: {
            branchId: true,
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    this.assertBranchAccess(actor, booking.room.branchId, 'bookings', [
      'BRANCH_MANAGER',
    ]);

    const finalPrice = toMoneyDecimal(dto.finalPrice);

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        finalPrice: finalPrice ?? undefined,
        priceNote: dto.priceNote,
      },
      select: { id: true, finalPrice: true, priceNote: true },
    });

    await this.auditService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorIp: actor.actorIp,
      action: AUDIT_ACTIONS.BOOKING_PRICE_UPDATED,
      targetTable: AUDIT_TARGET_TABLES.BOOKINGS,
      targetId: booking.id,
      oldValue: {
        finalPrice: booking.finalPrice,
        priceNote: booking.priceNote,
      },
      newValue: {
        finalPrice: updatedBooking.finalPrice,
        priceNote: updatedBooking.priceNote,
      },
    });

    return updatedBooking;
  }

  private async generateBookingCode(): Promise<string> {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const suffix = randomBytes(2).toString('hex').toUpperCase();
    const code = `BK-${dateStr}-${suffix}`;

    const existing = await this.prisma.booking.findUnique({
      where: { bookingCode: code },
    });
    if (existing) return this.generateBookingCode();

    return code;
  }

  private resolveScopedBranchId(
    actor: BookingActorContext,
    requestedBranchId?: string,
  ) {
    if (!this.isBranchScopedRole(actor.role)) {
      return requestedBranchId;
    }

    if (!actor.branchId) {
      throw new ForbiddenException(
        'Active staff record is not assigned to a branch',
      );
    }

    if (requestedBranchId && requestedBranchId !== actor.branchId) {
      throw new ForbiddenException(
        'You can only access bookings in your assigned branch',
      );
    }

    return actor.branchId;
  }

  private assertValidStatusTransition(
    currentStatus: BookingStatus,
    nextStatus: BookingStatus,
  ) {
    if (currentStatus === nextStatus) {
      throw new BadRequestException('Booking is already in this status');
    }

    const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
      CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
      CHECKED_IN: ['CHECKED_OUT'],
      CHECKED_OUT: [],
      CANCELLED: [],
      NO_SHOW: [],
    };

    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(
        `Cannot change booking status from ${currentStatus} to ${nextStatus}`,
      );
    }
  }

  private assertBranchAccess(
    actor: BookingActorContext,
    branchId: string,
    resourceLabel: string,
    scopedRoles = ['BRANCH_MANAGER', 'RECEPTIONIST'],
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

  private isBranchScopedRole(role: string) {
    return role === 'BRANCH_MANAGER' || role === 'RECEPTIONIST';
  }

  private buildPriceSummary(
    finalPrice: Prisma.Decimal,
    extensions: Array<{ extraPrice: Prisma.Decimal }>,
  ) {
    const extensionTotalPrice = toMoneyDecimal(
      extensions.reduce(
        (sum, extension) => sum.plus(extension.extraPrice),
        new Prisma.Decimal(0),
      ),
    ) as Prisma.Decimal;
    const effectiveFinalPrice = toMoneyDecimal(
      finalPrice.plus(extensionTotalPrice),
    ) as Prisma.Decimal;

    return {
      extensionTotalPrice,
      effectiveFinalPrice,
    };
  }

  private async ensureCheckoutCleaningTask(
    booking: {
      id: string;
      roomId: string;
      room: { branchId: string };
      actualCheckOut?: Date | null;
    },
    assignedByStaffId?: string,
  ) {
    if (!assignedByStaffId) return;

    const existingTask = await this.prisma.housekeepingTask.findFirst({
      where: {
        bookingId: booking.id,
        taskType: 'CHECKOUT_CLEAN',
      },
      select: { id: true },
    });

    if (existingTask) return;

    const scheduledDate = new Date(booking.actualCheckOut ?? new Date());
    scheduledDate.setUTCHours(0, 0, 0, 0);
    const scheduledTime = this.housekeepingDispatchService.formatScheduledTime(
      booking.actualCheckOut ?? new Date(),
    );
    const assignedToStaff =
      await this.housekeepingDispatchService.findBestHousekeeper(
        booking.room.branchId,
      );

    await this.prisma.housekeepingTask.create({
      data: {
        roomId: booking.roomId,
        bookingId: booking.id,
        assignedToStaffId: assignedToStaff?.id,
        assignedByStaffId,
        branchId: booking.room.branchId,
        taskType: 'CHECKOUT_CLEAN',
        scheduledDate,
        scheduledTime,
        notes: 'Auto-created when booking was checked out',
      },
    });
  }
}
