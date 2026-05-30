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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { MarketplaceToggleDto } from './dto/marketplace-toggle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a branch' })
  @ApiResponse({ status: 201, description: 'Branch created' })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateBranchDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.branchesService.create(orgId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List branches of current organization' })
  @ApiResponse({ status: 200, description: 'List of branches' })
  async findAll(@CurrentUser('id') userId: string) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.branchesService.findAll(orgId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get branch detail' })
  @ApiResponse({ status: 200, description: 'Branch detail' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.branchesService.findOne(id, orgId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER', 'ORG_MANAGER', 'BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update branch' })
  @ApiResponse({ status: 200, description: 'Branch updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.branchesService.update(id, orgId, dto);
  }

  @Patch(':id/marketplace')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle marketplace listing' })
  @ApiResponse({ status: 200, description: 'Marketplace status updated' })
  async toggleMarketplace(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: MarketplaceToggleDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.branchesService.toggleMarketplace(id, orgId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete branch' })
  @ApiResponse({ status: 200, description: 'Branch deleted' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.branchesService.remove(id, orgId);
  }
}
