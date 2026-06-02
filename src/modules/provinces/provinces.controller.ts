import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProvincesService } from './provinces.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  errorResponseSchema,
  successResponseSchema,
} from '../../common/swagger/response-schema.util';

@ApiTags('Provinces')
@Controller('provinces')
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active provinces (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of provinces',
    schema: successResponseSchema([
      {
        id: 'uuid-prov-001',
        name: 'TP. Ho Chi Minh',
        slug: 'ho-chi-minh',
        region: 'SOUTH',
      },
      {
        id: 'uuid-prov-002',
        name: 'Da Lat',
        slug: 'da-lat',
        region: 'CENTRAL',
      },
    ]),
  })
  async findAll() {
    return this.provincesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Create a province (Admin only)' })
  @ApiBody({ type: CreateProvinceDto })
  @ApiResponse({
    status: 201,
    description: 'Province created',
    schema: successResponseSchema({
      id: 'uuid-prov-006',
      name: 'Phu Quoc',
      slug: 'phu-quoc',
      region: 'SOUTH',
      isActive: true,
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Province slug already exists',
    schema: errorResponseSchema(
      409,
      'Province slug already exists',
      'CONFLICT',
    ),
  })
  async create(@Body() dto: CreateProvinceDto) {
    return this.provincesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update or toggle province (Admin only)' })
  @ApiParam({ name: 'id', example: 'uuid-prov-006' })
  @ApiBody({ type: UpdateProvinceDto })
  @ApiResponse({
    status: 200,
    description: 'Province updated',
    schema: successResponseSchema({
      id: 'uuid-prov-006',
      name: 'Phu Quoc',
      slug: 'phu-quoc',
      region: 'SOUTH',
      isActive: false,
      sortOrder: 6,
    }),
  })
  async update(@Param('id') id: string, @Body() dto: UpdateProvinceDto) {
    return this.provincesService.update(id, dto);
  }
}
