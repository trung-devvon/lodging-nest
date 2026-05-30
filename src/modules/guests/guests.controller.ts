import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { QueryGuestsDto } from './dto/query-guests.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BranchesService } from '../branches/branches.service';

@ApiTags('Guests')
@Controller('guests')
export class GuestsController {
  constructor(
    private readonly guestsService: GuestsService,
    private readonly branchesService: BranchesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a guest profile' })
  @ApiResponse({ status: 201, description: 'Guest created' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateGuestDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.guestsService.create(orgId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List guests' })
  @ApiResponse({ status: 200, description: 'List of guests' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryGuestsDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.guestsService.findAll(orgId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get guest detail with booking history' })
  @ApiResponse({ status: 200, description: 'Guest detail' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.guestsService.findOne(id, orgId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update guest profile' })
  @ApiResponse({ status: 200, description: 'Guest updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateGuestDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.guestsService.update(id, orgId, dto);
  }
}
