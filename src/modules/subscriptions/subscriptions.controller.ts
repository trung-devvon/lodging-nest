import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all subscription plans (public)' })
  @ApiResponse({ status: 200, description: 'List of plans' })
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current organization subscription' })
  @ApiResponse({ status: 200, description: 'Current subscription' })
  async getMySubscription(@CurrentUser('id') userId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { ownerId: userId },
    });
    if (!org) throw new Error('No organization found');
    return this.subscriptionsService.getMySubscription(org.id);
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  @ApiResponse({ status: 201, description: 'Subscription upgraded' })
  async upgrade(
    @CurrentUser('id') userId: string,
    @Body() dto: UpgradeSubscriptionDto,
  ) {
    const org = await this.prisma.organization.findFirst({
      where: { ownerId: userId },
    });
    if (!org) throw new Error('No organization found');
    return this.subscriptionsService.upgrade(org.id, dto);
  }
}
