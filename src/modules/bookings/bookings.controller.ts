import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingPriceDto } from './dto/update-booking-price.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BranchesService } from '../branches/branches.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly branchesService: BranchesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    const staff = await this.prisma.staff.findFirst({ where: { userId } });
    return this.bookingsService.create(orgId, staff?.id ?? '', dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List bookings' })
  @ApiResponse({ status: 200, description: 'List of bookings' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryBookingsDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.bookingsService.findAll(orgId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking detail' })
  @ApiResponse({ status: 200, description: 'Booking detail' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.bookingsService.findOne(id, orgId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking status (checkin/checkout/cancel)' })
  @ApiResponse({ status: 200, description: 'Booking status updated' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.bookingsService.updateStatus(id, orgId, dto);
  }

  @Patch(':id/price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adjust booking price' })
  @ApiResponse({ status: 200, description: 'Booking price updated' })
  async updatePrice(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBookingPriceDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.bookingsService.updatePrice(id, orgId, dto);
  }
}
