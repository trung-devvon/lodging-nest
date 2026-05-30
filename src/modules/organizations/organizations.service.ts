import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrgStatusDto } from './dto/update-org-status.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const existingSlug = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException('Organization slug already exists');
    }

    return this.prisma.organization.create({
      data: {
        ownerId: userId,
        name: dto.name,
        slug: dto.slug,
        taxCode: dto.taxCode,
        businessType: dto.businessType ?? 'HOMESTAY',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        businessType: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async findAll(query: QueryOrganizationsDto) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { taxCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          businessType: true,
          status: true,
          logoUrl: true,
          taxCode: true,
          createdAt: true,
          owner: { select: { id: true, email: true, phone: true } },
          _count: { select: { branches: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyOrg(userId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { ownerId: userId },
      include: {
        _count: { select: { branches: true } },
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIALING'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateMyOrg(userId: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.findFirst({
      where: { ownerId: userId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    return this.prisma.organization.update({
      where: { id: org.id },
      data: dto,
      select: {
        id: true,
        name: true,
        slug: true,
        businessType: true,
        taxCode: true,
        logoUrl: true,
        status: true,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateOrgStatusDto) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');

    return this.prisma.organization.update({
      where: { id },
      data: { status: dto.status },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    });
  }
}
