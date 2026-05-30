import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { QueryGuestsDto } from './dto/query-guests.dto';

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

    const where: any = { organizationId };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tags) {
      where.tags = { hasSome: tags.split(',') };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.guestProfile.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          phone: true,
          tags: true,
          totalStays: true,
          totalSpent: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.guestProfile.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findOne(id: string, organizationId: string) {
    const guest = await this.prisma.guestProfile.findFirst({
      where: { id, organizationId },
      include: {
        bookings: {
          select: {
            bookingCode: true,
            checkIn: true,
            checkOut: true,
            finalPrice: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }

  async update(id: string, organizationId: string, dto: UpdateGuestDto) {
    const guest = await this.prisma.guestProfile.findFirst({
      where: { id, organizationId },
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
}
