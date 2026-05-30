import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

    const existingOrganization = await this.prisma.organization.findFirst({
      where: {
        ownerId: userId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existingOrganization) {
      throw new ConflictException('User already owns an organization');
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
    const { page = 1, limit = 20, status, businessType, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (businessType) where.businessType = businessType;
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
          owner: { select: { id: true, email: true, phone: true } },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              status: true,
              currentPeriodEnd: true,
              plan: {
                select: {
                  displayName: true,
                },
              },
            },
          },
          _count: { select: { branches: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: data.map((organization) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        businessType: organization.businessType,
        status: organization.status,
        owner: organization.owner,
        subscription: organization.subscriptions[0]
          ? {
              planName: organization.subscriptions[0].plan.displayName,
              status: organization.subscriptions[0].status,
              currentPeriodEnd: organization.subscriptions[0].currentPeriodEnd,
            }
          : null,
        _count: organization._count,
      })),
      meta: { total, page, limit },
    };
  }

  async findMyOrg(userId: string) {
    const ownedOrg = await this.prisma.organization.findFirst({
      where: {
        ownerId: userId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const staffMembership = ownedOrg
      ? null
      : await this.prisma.staff.findFirst({
          where: {
            userId,
            isActive: true,
            organization: { deletedAt: null },
          },
          select: { organizationId: true },
        });

    const organizationId = ownedOrg?.id ?? staffMembership?.organizationId;
    if (!organizationId) throw new NotFoundException('Organization not found');

    const org = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        businessType: true,
        logoUrl: true,
        status: true,
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIALING'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            currentPeriodEnd: true,
            plan: {
              select: {
                displayName: true,
                maxBranches: true,
                canListOnMarketplace: true,
              },
            },
          },
        },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      businessType: org.businessType,
      logoUrl: org.logoUrl,
      status: org.status,
      subscription: org.subscriptions[0]
        ? {
            planName: org.subscriptions[0].plan.displayName,
            displayName: org.subscriptions[0].plan.displayName,
            status: org.subscriptions[0].status,
            currentPeriodEnd: org.subscriptions[0].currentPeriodEnd,
            maxBranches: org.subscriptions[0].plan.maxBranches,
            canListOnMarketplace: org.subscriptions[0].plan.canListOnMarketplace,
          }
        : null,
    };
  }

  async updateMyOrg(userId: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!org) throw new NotFoundException('Organization not found');

    return this.prisma.organization.update({
      where: { id: org.id },
      data: dto,
      select: {
        id: true,
        name: true,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateOrgStatusDto) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
    });
    if (!org) throw new NotFoundException('Organization not found');

    return this.prisma.organization.update({
      where: { id },
      data: { status: dto.status },
      select: {
        id: true,
        status: true,
      },
    });
  }
}
