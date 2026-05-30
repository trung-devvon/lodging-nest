import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { RoomPricingService } from './room-pricing.service';
import { CreateRoomPricingDto, UpdateRoomPricingDto } from './dto/room-pricing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Room Pricing')
@Controller()
export class RoomPricingController {
  constructor(private readonly roomPricingService: RoomPricingService) {}

  @Post('rooms/:roomId/pricing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'ORG_MANAGER', 'ORG_OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create pricing rule for a room' })
  @ApiBody({ type: CreateRoomPricingDto })
  @ApiResponse({ status: 201, description: 'Pricing rule created' })
  create(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRoomPricingDto,
  ) {
    return this.roomPricingService.create(roomId, userId, dto);
  }

  @Get('rooms/:roomId/pricing')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pricing rules for a room' })
  @ApiResponse({ status: 200, description: 'List of pricing rules' })
  findAll(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.roomPricingService.findAll(roomId, userId, from, to);
  }

  @Patch('pricing/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'ORG_MANAGER', 'ORG_OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update pricing rule' })
  @ApiBody({ type: UpdateRoomPricingDto })
  @ApiResponse({ status: 200, description: 'Pricing rule updated' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRoomPricingDto,
  ) {
    return this.roomPricingService.update(id, userId, dto);
  }

  @Delete('pricing/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete pricing rule' })
  @ApiResponse({ status: 200, description: 'Pricing rule deleted' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.roomPricingService.remove(id, userId);
  }
}
