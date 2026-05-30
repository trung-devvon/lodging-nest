import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { ToggleStaffActiveDto } from './dto/toggle-staff-active.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BranchesService } from '../branches/branches.service';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly branchesService: BranchesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a staff member' })
  @ApiResponse({ status: 201, description: 'Staff created' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStaffDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.staffService.create(orgId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List staff members' })
  @ApiResponse({ status: 200, description: 'List of staff' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryStaffDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.staffService.findAll(orgId, query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update staff member' })
  @ApiResponse({ status: 200, description: 'Staff updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStaffDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.staffService.update(id, orgId, dto);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate/deactivate staff' })
  @ApiResponse({ status: 200, description: 'Staff status updated' })
  async toggleActive(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ToggleStaffActiveDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.staffService.toggleActive(id, orgId, dto);
  }
}
