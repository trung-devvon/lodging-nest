import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { toMoneyDecimal } from '../../common/utils/pricing.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { QueryGuestsDto } from './dto/query-guests.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateGuestDto) {
    return this.prisma.guestProfile.create({
      data: {
        organizationId,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        nationalId: dto.nationalId,
        nationality: dto.nationality,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        notes: dto.notes,
        tags: dto.tags ?? [],
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        tags: true,
        totalStays: true,
        totalSpent: true,
        createdAt: true,
      },
    });
  }

  async findAll(organizationId: string, query: QueryGuestsDto) {
    const { search, tags } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.GuestProfileWhereInput = { organizationId };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tags) {
      const tagList = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      if (tagList.length > 0) {
        where.tags = { hasSome: tagList };
      }
    }

    const [guests, total] = await this.prisma.$transaction([
      this.prisma.guestProfile.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          phone: true,
          tags: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.guestProfile.count({ where }),
    ]);

    const statsByGuestId = await this.buildGuestStatsMap(
      guests.map((guest) => guest.id),
    );

    return {
      data: guests.map((guest) => ({
        ...guest,
        totalStays: statsByGuestId[guest.id]?.totalStays ?? 0,
        totalSpent: statsByGuestId[guest.id]?.totalSpent ?? new Prisma.Decimal(0),
      })),
      meta: { total, page, limit },
    };
  }

  async findOne(id: string, organizationId: string) {
    const guest = await this.prisma.guestProfile.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        nationalId: true,
        nationality: true,
        dateOfBirth: true,
        gender: true,
        notes: true,
        tags: true,
        bookings: {
          select: {
            id: true,
            bookingCode: true,
            checkIn: true,
            checkOut: true,
            finalPrice: true,
            status: true,
            extensions: {
              select: {
                extraPrice: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!guest) throw new NotFoundException('Guest not found');

    const { bookings, ...guestProfile } = guest;

    const statsByGuestId = await this.buildGuestStatsMap([guest.id]);
    const stats = statsByGuestId[guest.id] ?? {
      totalStays: 0,
      totalSpent: new Prisma.Decimal(0),
    };

    const recentBookings = bookings.map(({ extensions, ...booking }) => {
      const extensionTotalPrice = this.sumExtensionPrices(extensions);
      const effectiveFinalPrice = toMoneyDecimal(
        booking.finalPrice.plus(extensionTotalPrice),
      ) as Prisma.Decimal;

      return {
        ...booking,
        extensionTotalPrice,
        effectiveFinalPrice,
      };
    });

    return {
      ...guestProfile,
      recentBookings,
      totalStays: stats.totalStays,
      totalSpent: stats.totalSpent,
    };
  }

  async update(id: string, organizationId: string, dto: UpdateGuestDto) {
    const guest = await this.prisma.guestProfile.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!guest) throw new NotFoundException('Guest not found');

    return this.prisma.guestProfile.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        tags: true,
        notes: true,
      },
    });
  }

  private async buildGuestStatsMap(guestIds: string[]) {
    if (guestIds.length === 0) {
      return {} as Record<
        string,
        { totalStays: number; totalSpent: Prisma.Decimal }
      >;
    }

    const checkedOutBookings = await this.prisma.booking.findMany({
      where: {
        guestProfileId: { in: guestIds },
        status: BookingStatus.CHECKED_OUT,
      },
      select: {
        id: true,
        guestProfileId: true,
        finalPrice: true,
        extensions: {
          select: {
            extraPrice: true,
          },
        },
      },
    });

    const stats = guestIds.reduce<
      Record<string, { totalStays: number; totalSpent: Prisma.Decimal }>
    >((acc, guestId) => {
      acc[guestId] = {
        totalStays: 0,
        totalSpent: new Prisma.Decimal(0),
      };
      return acc;
    }, {});

    for (const booking of checkedOutBookings) {
      const extensionTotalPrice = this.sumExtensionPrices(booking.extensions);
      const effectiveFinalPrice = toMoneyDecimal(
        booking.finalPrice.plus(extensionTotalPrice),
      ) as Prisma.Decimal;

      const guestStat = stats[booking.guestProfileId];
      guestStat.totalStays += 1;
      guestStat.totalSpent = toMoneyDecimal(
        guestStat.totalSpent.plus(effectiveFinalPrice),
      ) as Prisma.Decimal;
    }

    return stats;
  }

  private sumExtensionPrices(
    extensions: Array<{
      extraPrice: Prisma.Decimal;
    }>,
  ) {
    return extensions.reduce(
      (total, extension) => total.plus(extension.extraPrice),
      new Prisma.Decimal(0),
    );
  }
}
