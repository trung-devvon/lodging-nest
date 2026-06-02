import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessContextService } from '../../common/services/access-context.service';
import {
  errorResponseSchema,
  successResponseSchema,
} from '../../common/swagger/response-schema.util';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { ToggleStaffActiveDto } from './dto/toggle-staff-active.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly accessContextService: AccessContextService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Create a staff member' })
  @ApiBody({ type: CreateStaffDto })
  @ApiResponse({
    status: 201,
    description: 'Staff created',
    schema: successResponseSchema({
      id: 'uuid-staff-001',
      user: {
        id: 'uuid-user-staff-001',
        email: 'letan01@annhien.com',
        phone: '0902222333',
      },
      branch: {
        id: 'uuid-branch-001',
        name: 'An Nhien Homestay - Co so Vung Tau',
      },
      position: 'Le tan',
      staffRole: 'RECEPTIONIST',
      hireDate: '2025-05-01T00:00:00.000Z',
      isActive: true,
    }),
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStaffDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.staffService.create(organizationId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List staff members' })
  @ApiQuery({ name: 'branchId', required: false, example: 'uuid-branch-001' })
  @ApiQuery({
    name: 'staffRole',
    required: false,
    example: 'RECEPTIONIST',
  })
  @ApiQuery({ name: 'isActive', required: false, example: true })
  @ApiResponse({
    status: 200,
    description: 'List of staff',
    schema: successResponseSchema([
      {
        id: 'uuid-staff-001',
        user: {
          email: 'letan01@annhien.com',
          phone: '0902222333',
        },
        branch: {
          id: 'uuid-branch-001',
          name: 'An Nhien Homestay - Co so Vung Tau',
        },
        position: 'Le tan',
        staffRole: 'RECEPTIONIST',
        hireDate: '2025-05-01T00:00:00.000Z',
        terminatedDate: null,
        isActive: true,
      },
    ]),
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: QueryStaffDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.staffService.findAll(organizationId, userId, role, query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update staff member' })
  @ApiParam({ name: 'id', example: 'uuid-staff-001' })
  @ApiBody({ type: UpdateStaffDto })
  @ApiResponse({
    status: 200,
    description: 'Staff updated',
    schema: successResponseSchema({
      id: 'uuid-staff-001',
      user: {
        email: 'letan01@annhien.com',
        phone: '0902222333',
      },
      branch: {
        id: 'uuid-branch-001',
        name: 'An Nhien Homestay - Co so Vung Tau',
      },
      position: 'Truong le tan',
      staffRole: 'BRANCH_MANAGER',
      hireDate: '2025-05-01T00:00:00.000Z',
      terminatedDate: null,
      isActive: true,
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid staff update',
    schema: errorResponseSchema(
      400,
      'branchId is required for branch-scoped staff roles',
      'BAD_REQUEST',
    ),
  })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStaffDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.staffService.update(id, organizationId, dto);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Activate/deactivate staff' })
  @ApiParam({ name: 'id', example: 'uuid-staff-001' })
  @ApiBody({ type: ToggleStaffActiveDto })
  @ApiResponse({
    status: 200,
    description: 'Staff status updated',
    schema: successResponseSchema({
      id: 'uuid-staff-001',
      user: {
        email: 'letan01@annhien.com',
        isActive: false,
      },
      isActive: false,
    }),
  })
  async toggleActive(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ToggleStaffActiveDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.staffService.toggleActive(id, organizationId, dto);
  }
}
