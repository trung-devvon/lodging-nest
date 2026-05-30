import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingPriceDto } from './dto/update-booking-price.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, staffId: string, dto: CreateBookingDto) {
    const room = await this.prisma.room.findFirst({
      where: { id: dto.roomId, branch: { organizationId }, deletedAt: null },
      include: { branch: { select: { bufferHours: true } } },
    });
    if (!room) throw new NotFoundException('Room not found');

    const rate = await this.prisma.roomRate.findUnique({
      where: { id: dto.rateId },
    });
    if (!rate || !rate.isActive) throw new BadRequestException('Invalid or inactive rate');

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkIn >= checkOut) throw new BadRequestException('Check-in must be before check-out');

    const conflict = await this.prisma.booking.findFirst({
      where: {
        roomId: dto.roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });
    if (conflict) {
      throw new ConflictException({
        code: 'ROOM_NOT_AVAILABLE',
        message: 'Room is already booked for this time period',
      });
    }

    const bookingCode = await this.generateBookingCode();

    const basePrice = Number(rate.price);

    return this.prisma.booking.create({
      data: {
        bookingCode,
        guestProfileId: dto.guestProfileId,
        roomId: dto.roomId,
        createdByStaffId: staffId,
        checkIn,
        checkOut,
        rateId: dto.rateId,
        basePrice,
        finalPrice: basePrice,
        depositAmount: dto.depositAmount ?? 0,
        numAdults: dto.numAdults,
        numChildren: dto.numChildren ?? 0,
        note: dto.note,
        source: dto.source,
        status: 'CONFIRMED',
      },
      include: {
        room: { select: { id: true, name: true } },
        guestProfile: { select: { id: true, fullName: true, phone: true } },
      },
    });
  }

  async findAll(organizationId: string, query: QueryBookingsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      room: { branch: { organizationId, deletedAt: null } },
    };

    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { bookingCode: { contains: query.search, mode: 'insensitive' } },
        { guestProfile: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.date) {
      const date = new Date(query.date);
      where.checkIn = { gte: date };
      where.checkIn = { ...where.checkIn, lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) };
    }
    if (query.branchId) {
      where.room = { ...where.room, branchId: query.branchId };
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
          status: true,
          source: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string, organizationId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, room: { branch: { organizationId } } },
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
          select: { position: true },
        },
        extensions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async updateStatus(id: string, organizationId: string, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, room: { branch: { organizationId } } },
      include: { room: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const data: any = { status: dto.status };

    if (dto.status === 'CHECKED_OUT' && dto.actualCheckOut) {
      data.actualCheckOut = new Date(dto.actualCheckOut);
    }

    if (dto.status === 'CANCELLED') {
      data.cancelledAt = new Date();
      data.cancelReason = dto.cancelReason;
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data,
      select: { id: true, bookingCode: true, status: true, actualCheckOut: true },
    });

    if (dto.status === 'CHECKED_IN' && booking.room.status !== 'OCCUPIED') {
      await this.prisma.room.update({
        where: { id: booking.roomId },
        data: { status: 'OCCUPIED' },
      });
    }

    if (dto.status === 'CHECKED_OUT' || dto.status === 'CANCELLED') {
      const hasActive = await this.prisma.booking.findFirst({
        where: {
          roomId: booking.roomId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          id: { not: id },
        },
      });
      if (!hasActive) {
        await this.prisma.room.update({
          where: { id: booking.roomId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    return updated;
  }

  async updatePrice(id: string, organizationId: string, dto: UpdateBookingPriceDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, room: { branch: { organizationId } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    return this.prisma.booking.update({
      where: { id },
      data: { finalPrice: dto.finalPrice, priceNote: dto.priceNote },
      select: { id: true, finalPrice: true, priceNote: true },
    });
  }

  private async generateBookingCode(): Promise<string> {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const suffix = randomBytes(2).toString('hex').toUpperCase();
    const code = `BK-${dateStr}-${suffix}`;

    const existing = await this.prisma.booking.findUnique({ where: { bookingCode: code } });
    if (existing) return this.generateBookingCode();

    return code;
  }
}
