import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { QueryRoomsDto } from './dto/query-rooms.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BranchesService } from '../branches/branches.service';

@ApiTags('Rooms')
@Controller()
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly branchesService: BranchesService,
  ) {}

  @Post('branches/:branchId/rooms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Create a room in a branch' })
  @ApiParam({ name: 'branchId', example: 'uuid-branch-001' })
  @ApiBody({ type: CreateRoomDto })
  @ApiResponse({
    status: 201,
    description: 'Room created',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-room-001',
          name: 'Phong Deluxe Giuong Doi - 101',
          roomType: 'DELUXE',
          capacity: 2,
          status: 'AVAILABLE',
          createdAt: '2025-05-20T10:30:00.000Z',
        },
      },
    },
  })
  async create(
    @Param('branchId') branchId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateRoomDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.create(orgId, branchId, userId, role, dto);
  }

  @Get('branches/:branchId/rooms')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List rooms in a branch' })
  @ApiParam({ name: 'branchId', example: 'uuid-branch-001' })
  @ApiQuery({ name: 'status', required: false, example: 'AVAILABLE' })
  @ApiQuery({ name: 'roomType', required: false, example: 'DELUXE' })
  @ApiResponse({
    status: 200,
    description: 'List of rooms',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid-room-001',
            name: 'Phong Deluxe Giuong Doi - 101',
            roomType: 'DELUXE',
            capacity: 2,
            bedCount: 1,
            bedType: 'QUEEN',
            status: 'AVAILABLE',
            bufferHours: null,
            rates: [
              { id: 'uuid-rate-001', label: '3 gio', durationHours: 3, price: 200000 },
            ],
            coverImage: { url: 'https://res.cloudinary.com/demo/image/upload/rooms/room101.jpg' },
          },
        ],
      },
    },
  })
  async findAll(
    @Param('branchId') branchId: string,
    @CurrentUser('id') userId: string,
    @Query() query: QueryRoomsDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.findAll(orgId, branchId, query);
  }

  @Get('branches/:branchId/rooms/availability')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Check room availability' })
  @ApiParam({ name: 'branchId', example: 'uuid-branch-001' })
  @ApiQuery({ name: 'checkIn', required: true, example: '2025-05-25T14:00:00Z' })
  @ApiQuery({ name: 'checkOut', required: true, example: '2025-05-26T12:00:00Z' })
  @ApiResponse({ status: 200, description: 'Availability status' })
  async checkAvailability(
    @Param('branchId') branchId: string,
    @CurrentUser('id') userId: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
      throw new BadRequestException('checkIn and checkOut must be valid ISO datetime strings');
    }
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException('checkOut must be later than checkIn');
    }

    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.checkAvailability(
      orgId,
      branchId,
      checkInDate,
      checkOutDate,
    );
  }

  @Get('rooms/:id')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Get room detail' })
  @ApiParam({ name: 'id', example: 'uuid-room-001' })
  @ApiResponse({
    status: 200,
    description: 'Room detail',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-room-001',
          name: 'Phong Deluxe Giuong Doi - 101',
          roomType: 'DELUXE',
          capacity: 2,
          bedCount: 1,
          bedType: 'QUEEN',
          floorNumber: 1,
          roomAmenities: ['tv', 'air_conditioner', 'hot_water', 'balcony'],
          status: 'AVAILABLE',
          bufferHours: null,
          images: [
            { id: 'uuid-img-101', url: 'https://res.cloudinary.com/demo/room101-1.jpg', isCover: true, sortOrder: 1 },
          ],
          rates: [
            { id: 'uuid-rate-001', label: '3 gio', durationHours: 3, price: 200000, isActive: true },
          ],
        },
      },
    },
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.findOne(id, orgId);
  }

  @Patch('rooms/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update room' })
  @ApiParam({ name: 'id', example: 'uuid-room-001' })
  @ApiBody({ type: UpdateRoomDto })
  @ApiResponse({ status: 200, description: 'Room updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateRoomDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.update(id, orgId, userId, role, dto);
  }

  @Patch('rooms/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Change room status' })
  @ApiParam({ name: 'id', example: 'uuid-room-001' })
  @ApiBody({ type: UpdateRoomStatusDto })
  @ApiResponse({ status: 200, description: 'Room status updated' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateRoomStatusDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.updateStatus(id, orgId, userId, role, dto);
  }

  @Delete('rooms/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Archive room safely' })
  @ApiParam({ name: 'id', example: 'uuid-room-001' })
  @ApiResponse({
    status: 200,
    description: 'Room archived',
    schema: {
      example: {
        success: true,
        data: { message: 'Room has been archived' },
      },
    },
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.remove(id, orgId);
  }
}
