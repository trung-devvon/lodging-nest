import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OccupancyService } from '../../common/services/occupancy.service';
import { toMoneyDecimal } from '../../common/utils/pricing.util';
import { BookingActorContext } from '../bookings/booking-actor-context.interface';
import { CreateExtensionDto } from './dto/create-extension.dto';

@Injectable()
export class BookingExtensionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly occupancyService: OccupancyService,
  ) {}

  async create(
    actor: BookingActorContext,
    bookingId: string,
    dto: CreateExtensionDto,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        status: 'CHECKED_IN',
        room: {
          deletedAt: null,
          branch: { organizationId: actor.organizationId, deletedAt: null },
        },
      },
      select: {
        id: true,
        roomId: true,
        checkOut: true,
        actualCheckOut: true,
        finalPrice: true,
        room: {
          select: {
            branchId: true,
            bufferHours: true,
            branch: { select: { bufferHours: true } },
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Active booking not found');

    this.assertBranchAccess(actor, booking.room.branchId, 'booking extensions');
    if (!actor.staffId) {
      throw new ForbiddenException('Active staff record not found');
    }
    const staffId = actor.staffId;

    const effectiveCheckOut =
      this.occupancyService.getEffectiveCheckOut(booking);
    const newCheckOut = new Date(
      effectiveCheckOut.getTime() + dto.extraHours * 60 * 60 * 1000,
    );
    const bufferHours = this.occupancyService.getBufferHours(
      booking.room.bufferHours,
      booking.room.branch.bufferHours,
    );

    const conflictCandidates = await this.prisma.booking.findMany({
      where: {
        roomId: booking.roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        id: { not: bookingId },
        checkIn: {
          lt: this.occupancyService.getOccupiedUntil(
            { checkOut: newCheckOut },
            bufferHours,
          ),
        },
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
      effectiveCheckOut,
      newCheckOut,
      bufferHours,
    );

    if (conflict) {
      const latestAllowedCheckOut = new Date(
        conflict.checkIn.getTime() - bufferHours * 60 * 60 * 1000,
      );
      const maxExtension = Math.floor(
        (latestAllowedCheckOut.getTime() - effectiveCheckOut.getTime()) /
          (60 * 60 * 1000),
      );
      throw new ConflictException({
        code: 'EXTENSION_CONFLICT',
        message: `Cannot extend. Next booking starts at ${conflict.checkIn.toISOString()}. Max extension: ${Math.max(0, maxExtension)} hour(s).`,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const extension = await tx.bookingExtension.create({
        data: {
          bookingId,
          extraHours: dto.extraHours,
          extraPrice: dto.extraPrice,
          newCheckOut,
          approvedByStaffId: staffId,
          note: dto.note,
        },
        select: {
          id: true,
          bookingId: true,
          extraHours: true,
          extraPrice: true,
          newCheckOut: true,
          createdAt: true,
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { actualCheckOut: newCheckOut },
        select: { id: true },
      });

      const extensionTotals = await tx.bookingExtension.aggregate({
        where: { bookingId },
        _sum: { extraPrice: true },
      });

      const extensionTotalPrice =
        toMoneyDecimal(extensionTotals._sum.extraPrice) ??
        new Prisma.Decimal(0);
      const effectiveFinalPrice = toMoneyDecimal(
        booking.finalPrice.plus(extensionTotalPrice),
      ) as Prisma.Decimal;

      return {
        ...extension,
        priceSummary: {
          bookingFinalPrice: booking.finalPrice,
          extensionTotalPrice,
          effectiveFinalPrice,
        },
      };
    });
  }

  async findAll(actor: BookingActorContext, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        room: {
          deletedAt: null,
          branch: { organizationId: actor.organizationId, deletedAt: null },
        },
      },
      select: {
        id: true,
        room: {
          select: {
            branchId: true,
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    this.assertBranchAccess(actor, booking.room.branchId, 'booking extensions');

    return this.prisma.bookingExtension.findMany({
      where: { bookingId },
      select: {
        id: true,
        extraHours: true,
        extraPrice: true,
        newCheckOut: true,
        approvedByStaff: { select: { position: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private assertBranchAccess(
    actor: BookingActorContext,
    branchId: string,
    resourceLabel: string,
  ) {
    if (actor.role !== 'BRANCH_MANAGER' && actor.role !== 'RECEPTIONIST') {
      return;
    }

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
}
