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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a room rate' })
  @ApiResponse({ status: 201, description: 'Rate created' })
  async create(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRoomRateDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomRatesService.create(orgId, roomId, dto);
  }

  @Get('rooms/:roomId/rates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List rates of a room' })
  @ApiResponse({ status: 200, description: 'List of rates' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a rate' })
  @ApiResponse({ status: 200, description: 'Rate updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRoomRateDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomRatesService.update(id, orgId, dto);
  }

  @Delete('rates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a rate' })
  @ApiResponse({ status: 200, description: 'Rate deleted' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.roomRatesService.remove(id, orgId);
  }
}
