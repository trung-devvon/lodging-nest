import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getMySubscription(organizationId: string) {
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
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    if (!plan.isActive) throw new BadRequestException('Plan is not active');

    const currentSub = await this.prisma.subscription.findFirst({
      where: { organizationId, status: { in: ['ACTIVE', 'TRIALING'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (currentSub) {
      await this.prisma.subscription.update({
        where: { id: currentSub.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    }

    const sub = await this.prisma.subscription.create({
      data: {
        organizationId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
