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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { MarketplaceToggleDto } from './dto/marketplace-toggle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessContextService } from '../../common/services/access-context.service';
import {
  errorResponseSchema,
  successResponseSchema,
} from '../../common/swagger/response-schema.util';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly accessContextService: AccessContextService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Create a branch' })
  @ApiBody({ type: CreateBranchDto })
  @ApiResponse({
    status: 201,
    description: 'Branch created',
    schema: successResponseSchema({
      id: 'uuid-branch-001',
      name: 'An Nhien Homestay - Co so Vung Tau',
      provinceId: 'uuid-prov-002',
      isActive: true,
      isListedOnMarketplace: false,
      createdAt: '2025-05-20T10:00:00.000Z',
    }),
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBranchDto,
  ) {
    const orgId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.branchesService.create(orgId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List branches of current organization' })
  @ApiResponse({
    status: 200,
    description: 'List of branches',
    schema: successResponseSchema([
      {
        id: 'uuid-branch-001',
        name: 'An Nhien Homestay - Co so Vung Tau',
        address: '123 Tran Phu, Phuong 1',
        province: { id: 'uuid-prov-002', name: 'Vung Tau' },
        isActive: true,
        isListedOnMarketplace: true,
        bufferHours: 2,
        _count: { rooms: 8 },
      },
    ]),
  })
  async findAll(@CurrentUser('id') userId: string) {
    const orgId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.branchesService.findAll(orgId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Get branch detail' })
  @ApiParam({ name: 'id', example: 'uuid-branch-001' })
  @ApiResponse({
    status: 200,
    description: 'Branch detail',
    schema: successResponseSchema({
      id: 'uuid-branch-001',
      name: 'An Nhien Homestay - Co so Vung Tau',
      address: '123 Tran Phu, Phuong 1',
      district: 'TP. Vung Tau',
      latitude: 10.3461,
      longitude: 107.084,
      description: 'Homestay view bien...',
      amenities: ['wifi', 'pool', 'parking', 'bbq'],
      checkInTime: '14:00',
      checkOutTime: '12:00',
      bufferHours: 2,
      isListedOnMarketplace: true,
      images: [
        {
          id: 'uuid-img-001',
          url: 'https://res.cloudinary.com/demo/image/upload/branch/cover.jpg',
          isCover: true,
          sortOrder: 1,
        },
      ],
    }),
  })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const orgId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.branchesService.findOne(id, orgId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update branch' })
  @ApiParam({ name: 'id', example: 'uuid-branch-001' })
  @ApiBody({ type: UpdateBranchDto })
  @ApiResponse({
    status: 200,
    description: 'Branch updated',
    schema: successResponseSchema({
      id: 'uuid-branch-001',
      name: 'An Nhien Homestay - Co so Vung Tau',
      address: '123 Tran Phu, Phuong 1',
      district: 'TP. Vung Tau',
      description: 'Homestay view bien...',
      amenities: ['wifi', 'pool', 'parking'],
      checkInTime: '14:00',
      checkOutTime: '12:00',
      bufferHours: 2,
      isActive: true,
    }),
  })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateBranchDto,
  ) {
    const orgId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.branchesService.update(id, orgId, userId, role, dto);
  }

  @Patch(':id/marketplace')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Toggle marketplace listing' })
  @ApiParam({ name: 'id', example: 'uuid-branch-001' })
  @ApiBody({ type: MarketplaceToggleDto })
  @ApiResponse({
    status: 200,
    description: 'Marketplace status updated',
    schema: successResponseSchema({
      id: 'uuid-branch-001',
      isListedOnMarketplace: true,
    }),
  })
  @ApiResponse({
    status: 403,
    description: 'Current plan does not allow marketplace listing',
    schema: errorResponseSchema(
      403,
      'Goi hien tai khong ho tro dang len marketplace. Vui long nang cap goi.',
      'PLAN_NOT_ALLOWED',
    ),
  })
  async toggleMarketplace(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: MarketplaceToggleDto,
  ) {
    const orgId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.branchesService.toggleMarketplace(id, orgId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Archive branch safely' })
  @ApiParam({ name: 'id', example: 'uuid-branch-001' })
  @ApiResponse({
    status: 200,
    description: 'Branch archived',
    schema: successResponseSchema({
      message: 'Branch has been archived',
    }),
  })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const orgId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.branchesService.remove(id, orgId);
  }
}
