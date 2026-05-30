import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrgStatusDto } from './dto/update-org-status.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({
    status: 201,
    description: 'Organization created',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-org-001',
          name: 'An Nhiên Homestay',
          slug: 'an-nhien-homestay',
          businessType: 'HOMESTAY',
          status: 'PENDING_APPROVAL',
          createdAt: '2025-05-20T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List all organizations with pagination (SUPER_ADMIN)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, example: 'ACTIVE' })
  @ApiQuery({ name: 'businessType', required: false, example: 'HOMESTAY' })
  @ApiQuery({ name: 'search', required: false, example: 'an nhien' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of organizations',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid-org-001',
            name: 'An Nhiên Homestay',
            slug: 'an-nhien-homestay',
            businessType: 'HOMESTAY',
            status: 'ACTIVE',
            owner: {
              id: 'uuid-001',
              email: 'owner@annhien.com',
              phone: '0901234567',
            },
            subscription: {
              planName: 'Trú Chân',
              status: 'ACTIVE',
              currentPeriodEnd: '2025-06-20T00:00:00.000Z',
            },
            _count: { branches: 2 },
          },
        ],
        meta: { total: 12, page: 1, limit: 20 },
      },
    },
  })
  findAll(@Query() query: QueryOrganizationsDto) {
    return this.organizationsService.findAll(query);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Get current user organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-org-001',
          name: 'An Nhiên Homestay',
          slug: 'an-nhien-homestay',
          businessType: 'HOMESTAY',
          logoUrl: 'https://res.cloudinary.com/demo/image/upload/logo.jpg',
          status: 'ACTIVE',
          subscription: {
            planName: 'Trú Chân',
            displayName: 'Trú Chân',
            status: 'ACTIVE',
            currentPeriodEnd: '2025-06-20T00:00:00.000Z',
            maxBranches: 1,
            canListOnMarketplace: true,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  findMyOrg(@CurrentUser('id') userId: string) {
    return this.organizationsService.findMyOrg(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update current user organization' })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({
    status: 200,
    description: 'Organization updated',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-org-001',
          name: 'An Nhiên Homestay & Resort',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  updateMyOrg(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateMyOrg(userId, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update organization status (SUPER_ADMIN)' })
  @ApiParam({ name: 'id', example: 'uuid-org-001' })
  @ApiBody({ type: UpdateOrgStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Organization status updated',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid-org-001',
          status: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrgStatusDto,
  ) {
    return this.organizationsService.updateStatus(id, dto);
  }
}
