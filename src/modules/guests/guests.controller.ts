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
import { successResponseSchema } from '../../common/swagger/response-schema.util';
import { CreateGuestDto } from './dto/create-guest.dto';
import { QueryGuestsDto } from './dto/query-guests.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { GuestsService } from './guests.service';

@ApiTags('Guests')
@Controller('guests')
export class GuestsController {
  constructor(
    private readonly guestsService: GuestsService,
    private readonly accessContextService: AccessContextService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Create a guest profile' })
  @ApiBody({ type: CreateGuestDto })
  @ApiResponse({
    status: 201,
    description: 'Guest created',
    schema: successResponseSchema({
      id: 'uuid-guest-001',
      fullName: 'Nguyen Van An',
      phone: '0901111222',
      email: 'an.nguyen@gmail.com',
      tags: [],
      totalStays: 0,
      totalSpent: '0.00',
      createdAt: '2025-05-20T09:00:00.000Z',
    }),
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateGuestDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.guestsService.create(organizationId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List guests' })
  @ApiQuery({ name: 'search', required: false, example: 'nguyen van' })
  @ApiQuery({ name: 'tags', required: false, example: 'VIP,REGULAR' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of guests',
    schema: successResponseSchema(
      [
        {
          id: 'uuid-guest-001',
          fullName: 'Nguyen Van An',
          phone: '0901111222',
          tags: ['VIP'],
          totalStays: 5,
          totalSpent: '3500000.00',
        },
      ],
      { total: 120, page: 1, limit: 20 },
    ),
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryGuestsDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.guestsService.findAll(organizationId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Get guest detail with booking history' })
  @ApiParam({ name: 'id', example: 'uuid-guest-001' })
  @ApiResponse({
    status: 200,
    description: 'Guest detail',
    schema: successResponseSchema({
      id: 'uuid-guest-001',
      fullName: 'Nguyen Van An',
      phone: '0901111222',
      email: 'an.nguyen@gmail.com',
      nationality: 'VN',
      dateOfBirth: '1990-03-15T00:00:00.000Z',
      gender: 'MALE',
      notes: 'Khach hay dat phong view bien',
      tags: ['VIP'],
      totalStays: 5,
      totalSpent: '3650000.00',
      recentBookings: [
        {
          bookingCode: 'BK-20250525-A3K9',
          checkIn: '2025-05-25T14:00:00.000Z',
          checkOut: '2025-05-26T12:00:00.000Z',
          finalPrice: '500000.00',
          extensionTotalPrice: '150000.00',
          effectiveFinalPrice: '650000.00',
          status: 'CHECKED_OUT',
        },
      ],
    }),
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.guestsService.findOne(id, organizationId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update guest profile' })
  @ApiParam({ name: 'id', example: 'uuid-guest-001' })
  @ApiBody({ type: UpdateGuestDto })
  @ApiResponse({
    status: 200,
    description: 'Guest updated',
    schema: successResponseSchema({
      id: 'uuid-guest-001',
      fullName: 'Nguyen Van An',
      phone: '0901111222',
      email: 'an.nguyen@gmail.com',
      tags: ['VIP', 'REGULAR'],
      notes: 'Di ung long vat nuoi',
    }),
  })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateGuestDto,
  ) {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);
    return this.guestsService.update(id, organizationId, dto);
  }
}
