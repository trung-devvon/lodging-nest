import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { RoomRatesService } from './room-rates.service';
import { CreateRoomRateDto } from './dto/create-room-rate.dto';
import { UpdateRoomRateDto } from './dto/update-room-rate.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessContextService } from '../../common/services/access-context.service';
import {
  errorResponseSchema,
  successResponseSchema,
} from '../../common/swagger/response-schema.util';

@ApiTags('Room Rates')
@Controller()
export class RoomRatesController {
  constructor(
    private readonly roomRatesService: RoomRatesService,
    private readonly accessContextService: AccessContextService,
  ) {}

  @Post('rooms/:roomId/rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Create a room rate' })
  @ApiParam({ name: 'roomId', example: 'uuid-room-001' })
  @ApiBody({ type: CreateRoomRateDto })
  @ApiResponse({
    status: 201,
    description: 'Rate created',
    schema: successResponseSchema({
      id: 'uuid-rate-001',
      label: '3 gio',
      durationHours: 3,
      price: '200000.00',
      isActive: true,
      sortOrder: 1,
    }),
  })
  async create(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateRoomRateDto,
  ) {
    const orgId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.roomRatesService.create(orgId, roomId, userId, role, dto);
  }

  @Get('rooms/:roomId/rates')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List rates of a room' })
  @ApiParam({ name: 'roomId', example: 'uuid-room-001' })
  @ApiResponse({
    status: 200,
    description: 'List of rates',
    schema: successResponseSchema([
      {
        id: 'uuid-rate-001',
        label: '3 gio',
        durationHours: 3,
        price: '200000.00',
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 'uuid-rate-002',
        label: 'Qua dem',
        durationHours: 14,
        price: '500000.00',
        isActive: false,
        sortOrder: 2,
      },
    ]),
  })
  async findAll(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.roomRatesService.findAll(orgId, roomId);
  }

  @Patch('rates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update a rate' })
  @ApiParam({ name: 'id', example: 'uuid-rate-001' })
  @ApiBody({ type: UpdateRoomRateDto })
  @ApiResponse({
    status: 200,
    description: 'Rate updated',
    schema: successResponseSchema({
      id: 'uuid-rate-001',
      label: '3 gio',
      durationHours: 3,
      price: '220000.00',
      isActive: true,
      sortOrder: 1,
    }),
  })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateRoomRateDto,
  ) {
    const orgId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.roomRatesService.update(id, orgId, userId, role, dto);
  }

  @Delete('rates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Deactivate a room rate safely' })
  @ApiParam({ name: 'id', example: 'uuid-rate-001' })
  @ApiResponse({
    status: 200,
    description: 'Rate deactivated',
    schema: successResponseSchema({
      message: 'Room rate has been deactivated',
    }),
  })
  @ApiResponse({
    status: 404,
    description: 'Room rate not found',
    schema: errorResponseSchema(404, 'Room rate not found', 'NOT_FOUND'),
  })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const orgId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.roomRatesService.remove(id, orgId);
  }
}
