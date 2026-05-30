import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({ status: 201, description: 'Organization created' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all organizations with pagination (SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Paginated list of organizations' })
  findAll(@Query() query: QueryOrganizationsDto) {
    return this.organizationsService.findAll(query);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user organization' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  findMyOrg(@CurrentUser('id') userId: string) {
    return this.organizationsService.findMyOrg(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user organization' })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({ status: 200, description: 'Organization updated' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update organization status (SUPER_ADMIN)' })
  @ApiBody({ type: UpdateOrgStatusDto })
  @ApiResponse({ status: 200, description: 'Organization status updated' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrgStatusDto,
  ) {
    return this.organizationsService.updateStatus(id, dto);
  }
}
