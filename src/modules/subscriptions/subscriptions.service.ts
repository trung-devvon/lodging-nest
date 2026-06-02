import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AccessContextService } from '../../common/services/access-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessContextService: AccessContextService,
  ) {}

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        monthlyPrice: true,
        yearlyPrice: true,
        maxBranches: true,
        maxRoomsPerBranch: true,
        canListOnMarketplace: true,
        hasAdvancedReports: true,
        hasPrioritySupport: true,
      },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async resolveOrganizationIdForUser(userId: string) {
    return this.accessContextService.getOrganizationIdOrThrow(userId);
  }

  async getMySubscription(organizationId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!organization) throw new NotFoundException('Organization not found');

    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId, status: { in: ['ACTIVE', 'TRIALING'] } },
      include: {
        plan: {
          select: {
            name: true,
            displayName: true,
            monthlyPrice: true,
            maxBranches: true,
            canListOnMarketplace: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) throw new NotFoundException('No active subscription found');

    return {
      id: sub.id,
      plan: sub.plan,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }

  async upgrade(organizationId: string, dto: UpgradeSubscriptionDto) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!organization) throw new NotFoundException('Organization not found');

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    if (!plan.isActive) throw new BadRequestException('Plan is not active');

    const now = new Date();
    const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sub = await this.prisma.subscription.upsert({
      where: { organizationId },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelledAt: null,
      },
      create: {
        organizationId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
      },
      include: { plan: true },
    });

    return {
      id: sub.id,
      planId: sub.planId,
      planDisplayName: sub.plan.displayName,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }
}
