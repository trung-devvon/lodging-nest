import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBody,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { successResponseSchema } from '../../common/swagger/response-schema.util';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all subscription plans (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of plans',
    schema: successResponseSchema([
      {
        id: 'uuid-plan-001',
        name: 'LU_HANH',
        displayName: 'Lữ Hành',
        monthlyPrice: 0,
        yearlyPrice: 0,
        maxBranches: 1,
        maxRoomsPerBranch: 5,
        canListOnMarketplace: false,
        hasAdvancedReports: false,
        hasPrioritySupport: false,
      },
    ]),
  })
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Get current organization subscription' })
  @ApiResponse({
    status: 200,
    description: 'Current subscription',
    schema: successResponseSchema({
      id: 'uuid-sub-001',
      plan: {
        name: 'TRU_CHAN',
        displayName: 'Trú Chân',
        monthlyPrice: 299000,
        maxBranches: 1,
        canListOnMarketplace: true,
      },
      status: 'ACTIVE',
      currentPeriodStart: '2025-05-20T00:00:00.000Z',
      currentPeriodEnd: '2025-06-20T00:00:00.000Z',
    }),
  })
  async getMySubscription(@CurrentUser('id') userId: string) {
    const organizationId =
      await this.subscriptionsService.resolveOrganizationIdForUser(userId);
    return this.subscriptionsService.getMySubscription(organizationId);
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  @ApiBody({ type: UpgradeSubscriptionDto })
  @ApiResponse({
    status: 201,
    description: 'Subscription upgraded',
    schema: successResponseSchema({
      id: 'uuid-sub-001',
      planId: 'uuid-plan-003',
      planDisplayName: 'An Cư',
      status: 'ACTIVE',
      currentPeriodStart: '2025-05-20T00:00:00.000Z',
      currentPeriodEnd: '2025-06-20T00:00:00.000Z',
    }),
  })
  async upgrade(
    @CurrentUser('id') userId: string,
    @Body() dto: UpgradeSubscriptionDto,
  ) {
    const organizationId =
      await this.subscriptionsService.resolveOrganizationIdForUser(userId);
    return this.subscriptionsService.upgrade(organizationId, dto);
  }
}
