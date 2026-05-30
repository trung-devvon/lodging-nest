import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { HousekeepingService } from './housekeeping.service';
import { CreateHousekeepingDto, UpdateHousekeepingStatusDto, AssignHousekeepingDto, QueryHousekeepingDto } from './dto/housekeeping.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Housekeeping')
@Controller('housekeeping')
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a housekeeping task' })
  @ApiBody({ type: CreateHousekeepingDto })
  @ApiResponse({ status: 201, description: 'Task created' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateHousekeepingDto,
  ) {
    return this.housekeepingService.create(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List housekeeping tasks' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryHousekeepingDto,
  ) {
    return this.housekeepingService.findAll(userId, query);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update task status' })
  @ApiBody({ type: UpdateHousekeepingStatusDto })
  @ApiResponse({ status: 200, description: 'Task status updated' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateHousekeepingStatusDto,
  ) {
    return this.housekeepingService.updateStatus(id, userId, dto);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign task to staff' })
  @ApiBody({ type: AssignHousekeepingDto })
  @ApiResponse({ status: 200, description: 'Task assigned' })
  assign(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AssignHousekeepingDto,
  ) {
    return this.housekeepingService.assign(id, userId, dto);
  }
}
