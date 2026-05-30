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
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a room in a branch' })
  @ApiResponse({ status: 201, description: 'Room created' })
  async create(
    @Param('branchId') branchId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRoomDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.create(orgId, branchId, dto);
  }

  @Get('branches/:branchId/rooms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List rooms in a branch' })
  @ApiResponse({ status: 200, description: 'List of rooms' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check room availability' })
  @ApiResponse({ status: 200, description: 'Availability status' })
  async checkAvailability(
    @Param('branchId') branchId: string,
    @CurrentUser('id') userId: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.checkAvailability(
      orgId,
      branchId,
      new Date(checkIn),
      new Date(checkOut),
    );
  }

  @Get('rooms/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get room detail' })
  @ApiResponse({ status: 200, description: 'Room detail' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update room' })
  @ApiResponse({ status: 200, description: 'Room updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.update(id, orgId, dto);
  }

  @Patch('rooms/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change room status' })
  @ApiResponse({ status: 200, description: 'Room status updated' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRoomStatusDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.updateStatus(id, orgId, dto);
  }

  @Delete('rooms/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete room' })
  @ApiResponse({ status: 200, description: 'Room deleted' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomsService.remove(id, orgId);
  }
}
