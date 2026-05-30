import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
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
import { BranchesService } from '../branches/branches.service';

@ApiTags('Room Rates')
@Controller()
export class RoomRatesController {
  constructor(
    private readonly roomRatesService: RoomRatesService,
    private readonly branchesService: BranchesService,
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
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-rate-001',
          label: '3 gio',
          durationHours: 3,
          price: 200000,
          isActive: true,
          sortOrder: 1,
        },
      },
    },
  })
  async create(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateRoomRateDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
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
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid-rate-001',
            label: '3 gio',
            durationHours: 3,
            price: 200000,
            isActive: true,
            sortOrder: 1,
          },
          {
            id: 'uuid-rate-002',
            label: 'Qua dem',
            durationHours: 14,
            price: 500000,
            isActive: true,
            sortOrder: 2,
          },
        ],
      },
    },
  })
  async findAll(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
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
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-rate-001',
          label: '3 gio',
          durationHours: 3,
          price: 220000,
          isActive: true,
          sortOrder: 1,
        },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateRoomRateDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomRatesService.update(id, orgId, userId, role, dto);
  }

  @Delete('rates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Delete a room rate safely' })
  @ApiParam({ name: 'id', example: 'uuid-rate-001' })
  @ApiResponse({
    status: 200,
    description: 'Rate deleted',
    schema: {
      example: {
        success: true,
        data: { message: 'Room rate deleted' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Rate is still referenced by bookings or pricing rules',
    schema: {
      example: {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message:
            'Cannot delete room rate because it is referenced by existing bookings',
          statusCode: 400,
        },
      },
    },
  })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomRatesService.remove(id, orgId);
  }
}
