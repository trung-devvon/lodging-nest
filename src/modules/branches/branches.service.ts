import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { MarketplaceToggleDto } from './dto/marketplace-toggle.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateBranchDto) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { organizationId, status: { in: ['ACTIVE', 'TRIALING'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription. Please subscribe to a plan first.');
    }

    const branchCount = await this.prisma.branch.count({
      where: { organizationId, deletedAt: null },
    });

    if (
      subscription.plan.maxBranches !== -1 &&
      branchCount >= subscription.plan.maxBranches
    ) {
      throw new ForbiddenException(
        `Your plan (${subscription.plan.displayName}) allows max ${subscription.plan.maxBranches} branch(es). Please upgrade.`,
      );
    }

    return this.prisma.branch.create({
      data: {
        organizationId,
        provinceId: dto.provinceId,
        name: dto.name,
        address: dto.address,
        district: dto.district,
        latitude: dto.latitude,
        longitude: dto.longitude,
        description: dto.description,
        amenities: dto.amenities ?? [],
        checkInTime: dto.checkInTime ?? '14:00',
        checkOutTime: dto.checkOutTime ?? '12:00',
        bufferHours: dto.bufferHours ?? 2,
      },
      select: {
        id: true,
        name: true,
        provinceId: true,
        isActive: true,
        isListedOnMarketplace: true,
        createdAt: true,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        address: true,
        province: { select: { id: true, name: true } },
        isActive: true,
        isListedOnMarketplace: true,
        bufferHours: true,
        _count: { select: { rooms: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        branchImages: {
          select: { id: true, url: true, isCover: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(id: string, organizationId: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    return this.prisma.branch.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        name: true,
        address: true,
        district: true,
        description: true,
        amenities: true,
        checkInTime: true,
        checkOutTime: true,
        bufferHours: true,
        isActive: true,
      },
    });
  }

  async toggleMarketplace(id: string, organizationId: string, dto: MarketplaceToggleDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    if (dto.isListedOnMarketplace) {
      const subscription = await this.prisma.subscription.findFirst({
        where: { organizationId, status: { in: ['ACTIVE', 'TRIALING'] } },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription || !subscription.plan.canListOnMarketplace) {
        throw new ForbiddenException({
          code: 'PLAN_NOT_ALLOWED',
          message: `Your plan does not support marketplace listing. Please upgrade.`,
        });
      }
    }

    return this.prisma.branch.update({
      where: { id },
      data: { isListedOnMarketplace: dto.isListedOnMarketplace },
      select: { id: true, isListedOnMarketplace: true },
    });
  }

  async remove(id: string, organizationId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    await this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Branch deleted' };
  }

  async getOrganizationIdFromUser(userId: string): Promise<string | null> {
    const staff = await this.prisma.staff.findFirst({
      where: { userId },
      include: { branch: { select: { organizationId: true } } },
    });
    if (staff?.branch) return staff.branch.organizationId;

    const org = await this.prisma.organization.findFirst({
      where: { ownerId: userId },
    });
    return org?.id ?? null;
  }
}
