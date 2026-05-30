import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProvincesService } from './provinces.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Provinces')
@Controller('provinces')
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active provinces (public)' })
  @ApiResponse({ status: 200, description: 'List of provinces' })
  async findAll() {
    return this.provincesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a province (Admin only)' })
  @ApiResponse({ status: 201, description: 'Province created' })
  async create(@Body() dto: CreateProvinceDto) {
    return this.provincesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update or toggle province (Admin only)' })
  @ApiResponse({ status: 200, description: 'Province updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateProvinceDto) {
    return this.provincesService.update(id, dto);
  }
}
