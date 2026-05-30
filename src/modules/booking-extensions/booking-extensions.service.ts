import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExtensionDto } from './dto/create-extension.dto';

@Injectable()
export class BookingExtensionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, staffId: string, bookingId: string, dto: CreateExtensionDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, room: { branch: { organizationId } }, status: 'CHECKED_IN' },
    });
    if (!booking) throw new NotFoundException('Active booking not found');
    if (booking.status !== 'CHECKED_IN') {
      throw new BadRequestException('Can only extend checked-in bookings');
    }

    const newCheckOut = new Date(
      (booking.actualCheckOut ?? booking.checkOut).getTime() + dto.extraHours * 60 * 60 * 1000,
    );

    const conflict = await this.prisma.booking.findFirst({
      where: {
        roomId: booking.roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        id: { not: bookingId },
        checkIn: { lt: newCheckOut },
        checkOut: { gt: booking.checkOut },
      },
    });

    if (conflict) {
      const maxExtension = Math.floor(
        (conflict.checkIn.getTime() - (booking.actualCheckOut ?? booking.checkOut).getTime()) / (60 * 60 * 1000),
      );
      throw new ConflictException({
        code: 'EXTENSION_CONFLICT',
        message: `Cannot extend. Next booking starts at ${conflict.checkIn.toISOString()}. Max extension: ${Math.max(0, maxExtension)} hour(s).`,
      });
    }

    return this.prisma.bookingExtension.create({
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
  }

  async findAll(organizationId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, room: { branch: { organizationId } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');

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
}
