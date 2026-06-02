import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
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
import type { FastifyRequest } from 'fastify';
import { HousekeepingService } from './housekeeping.service';
import {
  CreateHousekeepingDto,
  UpdateHousekeepingStatusDto,
  AssignHousekeepingDto,
  QueryHousekeepingDto,
} from './dto/housekeeping.dto';
import { HousekeepingActorContext } from './housekeeping-actor-context.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessContextService } from '../../common/services/access-context.service';
import {
  errorResponseSchema,
  successResponseSchema,
} from '../../common/swagger/response-schema.util';

@ApiTags('Housekeeping')
@Controller('housekeeping')
export class HousekeepingController {
  constructor(
    private readonly housekeepingService: HousekeepingService,
    private readonly accessContextService: AccessContextService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Create a housekeeping task' })
  @ApiBody({ type: CreateHousekeepingDto })
  @ApiResponse({
    status: 201,
    description: 'Task created',
    schema: successResponseSchema({
      id: 'uuid-task-001',
      room: {
        id: 'uuid-room-001',
        name: 'Phong Deluxe Giuong Doi - 101',
        floorNumber: 1,
      },
      assignedTo: {
        id: 'uuid-staff-002',
        position: 'Tap vu tang 1',
        user: { email: 'housekeeper01@annhien.com', phone: '0902222333' },
      },
      taskType: 'DEEP_CLEAN',
      priority: 'NORMAL',
      scheduledDate: '2025-05-26T00:00:00.000Z',
      scheduledTime: '10:00',
      status: 'PENDING',
      notes: 'Thay toan bo chan ga goi, kiem tra minibar',
    }),
  })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Req() request: FastifyRequest,
    @Body() dto: CreateHousekeepingDto,
  ) {
    const actor = await this.getActorContext(
      userId,
      role,
      request.ip,
      ['BRANCH_MANAGER'],
    );
    return this.housekeepingService.create(actor, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'HOUSEKEEPER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List housekeeping tasks' })
  @ApiResponse({
    status: 200,
    description: 'List of tasks',
    schema: successResponseSchema(
      [
        {
          id: 'uuid-task-001',
          room: {
            id: 'uuid-room-001',
            name: 'Phong Deluxe Giuong Doi - 101',
            floorNumber: 1,
          },
          taskType: 'CHECKOUT_CLEAN',
          priority: 'HIGH',
          scheduledDate: '2025-05-26T00:00:00.000Z',
          scheduledTime: '12:00',
          status: 'PENDING',
          assignedTo: {
            id: 'uuid-staff-002',
            position: 'Tap vu tang 1',
            user: { email: 'housekeeper01@annhien.com', phone: '0902222333' },
          },
          notes: null,
        },
      ],
      { total: 24, page: 1, limit: 20 },
    ),
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: QueryHousekeepingDto,
  ) {
    const actor = await this.getActorContext(userId, role, undefined, [
      'BRANCH_MANAGER',
      'HOUSEKEEPER',
    ]);
    return this.housekeepingService.findAll(actor, query);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'HOUSEKEEPER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update task status' })
  @ApiParam({ name: 'id', example: 'uuid-task-001' })
  @ApiBody({ type: UpdateHousekeepingStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Task status updated',
    schema: successResponseSchema({
      id: 'uuid-task-001',
      status: 'DONE',
      startedAt: '2025-05-26T10:00:00.000Z',
      completedAt: '2025-05-26T10:30:00.000Z',
    }),
  })
  @ApiResponse({
    status: 403,
    description: 'Housekeepers can only update their own tasks',
    schema: errorResponseSchema(
      403,
      'You can only update your own housekeeping tasks',
      'FORBIDDEN',
    ),
  })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Req() request: FastifyRequest,
    @Body() dto: UpdateHousekeepingStatusDto,
  ) {
    const actor = await this.getActorContext(
      userId,
      role,
      request.ip,
      ['BRANCH_MANAGER', 'HOUSEKEEPER'],
    );
    return this.housekeepingService.updateStatus(actor, id, dto);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Assign task to staff' })
  @ApiParam({ name: 'id', example: 'uuid-task-001' })
  @ApiBody({ type: AssignHousekeepingDto })
  @ApiResponse({
    status: 200,
    description: 'Task assigned',
    schema: successResponseSchema({
      id: 'uuid-task-001',
      assignedTo: {
        id: 'uuid-staff-003',
        position: 'Tap vu tang 2',
        user: { email: 'housekeeper02@annhien.com', phone: '0903333444' },
      },
    }),
  })
  async assign(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: AssignHousekeepingDto,
  ) {
    const actor = await this.getActorContext(
      userId,
      role,
      undefined,
      ['BRANCH_MANAGER'],
    );
    return this.housekeepingService.assign(actor, id, dto);
  }

  private async getActorContext(
    userId: string,
    role: string,
    actorIp: string | undefined,
    allowedStaffRoles: string[],
  ): Promise<HousekeepingActorContext> {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    const staff = await this.accessContextService.getActiveStaffOrThrow(
      userId,
      organizationId,
      allowedStaffRoles,
    );

    return {
      organizationId,
      userId,
      role,
      staffId: staff.id,
      branchId: staff.branchId,
      staffRole: staff.staffRole,
      actorIp,
    };
  }
}
