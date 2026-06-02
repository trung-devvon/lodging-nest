import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RoomPricingService } from './room-pricing.service';
import {
  CreateRoomPricingDto,
  UpdateRoomPricingDto,
} from './dto/room-pricing.dto';
import { QueryRoomPricingDto } from './dto/query-room-pricing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessContextService } from '../../common/services/access-context.service';
import {
  errorResponseSchema,
  successResponseSchema,
} from '../../common/swagger/response-schema.util';

@ApiTags('Room Pricing')
@Controller()
export class RoomPricingController {
  constructor(
    private readonly roomPricingService: RoomPricingService,
    private readonly accessContextService: AccessContextService,
  ) {}

  @Post('rooms/:roomId/pricing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'ORG_MANAGER', 'ORG_OWNER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Create pricing rule for a room' })
  @ApiParam({ name: 'roomId', example: 'uuid-room-001' })
  @ApiBody({ type: CreateRoomPricingDto })
  @ApiResponse({
    status: 201,
    description: 'Pricing rule created',
    schema: successResponseSchema({
      id: 'uuid-pricing-001',
      label: 'Le 30/4 - 1/5',
      startDate: '2025-04-30T00:00:00.000Z',
      endDate: '2025-05-01T00:00:00.000Z',
      priceAdjustType: 'PERCENT_INCREASE',
      adjustValue: '50.00',
      overridePrice: '0.00',
      isActive: true,
      room: { id: 'uuid-room-001', name: 'Phong Deluxe Giuong Doi - 101' },
      rate: null,
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid date range or invalid rate scope',
    schema: errorResponseSchema(
      400,
      'rateId must belong to the same room',
      'BAD_REQUEST',
    ),
  })
  @ApiResponse({
    status: 409,
    description: 'Pricing rule overlaps with another rule of the same scope',
    schema: errorResponseSchema(
      409,
      'Date range overlaps with existing pricing rule "Cuoi tuan - 3 gio" (2025-05-24 to 2025-05-25)',
      'CONFLICT',
    ),
  })
  async create(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateRoomPricingDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.roomPricingService.create(
      organizationId,
      roomId,
      userId,
      role,
      dto,
    );
  }

  @Get('rooms/:roomId/pricing')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Get pricing rules for a room' })
  @ApiParam({ name: 'roomId', example: 'uuid-room-001' })
  @ApiQuery({ name: 'from', required: false, example: '2025-05-01' })
  @ApiQuery({ name: 'to', required: false, example: '2025-07-31' })
  @ApiResponse({
    status: 200,
    description: 'List of pricing rules',
    schema: successResponseSchema([
      {
        id: 'uuid-pricing-001',
        roomId: 'uuid-room-001',
        rateId: null,
        label: 'Le 30/4 - 1/5',
        startDate: '2025-04-30T00:00:00.000Z',
        endDate: '2025-05-01T00:00:00.000Z',
        priceAdjustType: 'PERCENT_INCREASE',
        adjustValue: '50.00',
        overridePrice: '0.00',
        isActive: true,
        room: { id: 'uuid-room-001', name: 'Phong Deluxe Giuong Doi - 101' },
        rate: null,
      },
    ]),
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid from/to date',
    schema: errorResponseSchema(
      400,
      'from must be a valid ISO date string',
      'BAD_REQUEST',
    ),
  })
  async findAll(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
    @Query() query: QueryRoomPricingDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.roomPricingService.findAll(organizationId, roomId, query);
  }

  @Patch('pricing/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'ORG_MANAGER', 'ORG_OWNER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update pricing rule' })
  @ApiParam({ name: 'id', example: 'uuid-pricing-001' })
  @ApiBody({ type: UpdateRoomPricingDto })
  @ApiResponse({
    status: 200,
    description: 'Pricing rule updated',
    schema: successResponseSchema({
      id: 'uuid-pricing-001',
      roomId: 'uuid-room-001',
      rateId: 'uuid-rate-001',
      label: 'Cuoi tuan - 3 gio',
      startDate: '2025-05-24T00:00:00.000Z',
      endDate: '2025-05-25T00:00:00.000Z',
      priceAdjustType: 'FIXED',
      adjustValue: '0.00',
      overridePrice: '280000.00',
      isActive: false,
      room: { id: 'uuid-room-001', name: 'Phong Deluxe Giuong Doi - 101' },
      rate: { id: 'uuid-rate-001', label: '3 gio' },
    }),
  })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateRoomPricingDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.roomPricingService.update(
      id,
      organizationId,
      userId,
      role,
      dto,
    );
  }

  @Delete('pricing/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Delete pricing rule' })
  @ApiParam({ name: 'id', example: 'uuid-pricing-001' })
  @ApiResponse({
    status: 200,
    description: 'Pricing rule deleted',
    schema: successResponseSchema({
      message: 'Pricing rule deleted',
    }),
  })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.roomPricingService.remove(id, organizationId);
  }
}
