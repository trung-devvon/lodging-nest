import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingPriceDto } from './dto/update-booking-price.dto';
import { BookingActorContext } from './booking-actor-context.interface';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessContextService } from '../../common/services/access-context.service';
import {
  errorResponseSchema,
  successResponseSchema,
} from '../../common/swagger/response-schema.util';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly accessContextService: AccessContextService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Create a booking' })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({
    status: 201,
    description: 'Booking created',
    schema: successResponseSchema({
      id: 'uuid-booking-001',
      bookingCode: 'BK-20250525-A3K9',
      room: {
        id: 'uuid-room-001',
        name: 'Phong Deluxe Giuong Doi - 101',
      },
      guest: {
        id: 'uuid-guest-001',
        fullName: 'Nguyen Van An',
        phone: '0901111222',
      },
      checkIn: '2025-05-25T14:00:00.000Z',
      checkOut: '2025-05-26T12:00:00.000Z',
      rateLabel: 'Qua dem',
      basePrice: '500000.00',
      finalPrice: '550000.00',
      extensionTotalPrice: '0.00',
      effectiveFinalPrice: '550000.00',
      depositAmount: '200000.00',
      status: 'CONFIRMED',
      source: 'WALK_IN',
      createdAt: '2025-05-25T13:45:00.000Z',
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Room is not available during the requested time',
    schema: errorResponseSchema(
      409,
      'Room is already booked for this time period',
      'ROOM_NOT_AVAILABLE',
    ),
  })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Req() request: FastifyRequest,
    @Body() dto: CreateBookingDto,
  ) {
    const actor = await this.getActorContext(userId, role, request.ip, true);
    return this.bookingsService.create(actor, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List bookings' })
  @ApiResponse({
    status: 200,
    description: 'List of bookings',
    schema: successResponseSchema(
      [
        {
          id: 'uuid-booking-001',
          bookingCode: 'BK-20250525-A3K9',
          guest: {
            fullName: 'Nguyen Van An',
            phone: '0901111222',
          },
          room: { name: 'Phong Deluxe Giuong Doi - 101' },
          checkIn: '2025-05-25T14:00:00.000Z',
          checkOut: '2025-05-26T12:00:00.000Z',
          finalPrice: '550000.00',
          extensionTotalPrice: '0.00',
          effectiveFinalPrice: '550000.00',
          depositAmount: '200000.00',
          status: 'CONFIRMED',
          source: 'WALK_IN',
        },
      ],
      { total: 38, page: 1, limit: 20 },
    ),
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: QueryBookingsDto,
  ) {
    const actor = await this.getActorContext(userId, role);
    return this.bookingsService.findAll(actor, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Get booking detail' })
  @ApiParam({ name: 'id', example: 'uuid-booking-001' })
  @ApiResponse({
    status: 200,
    description: 'Booking detail',
    schema: successResponseSchema({
      id: 'uuid-booking-001',
      bookingCode: 'BK-20250525-A3K9',
      guest: {
        id: 'uuid-guest-001',
        fullName: 'Nguyen Van An',
        phone: '0901111222',
        email: 'an.nguyen@gmail.com',
      },
      room: {
        id: 'uuid-room-001',
        name: 'Phong Deluxe Giuong Doi - 101',
        branch: { name: 'An Nhien Homestay - Co so Vung Tau' },
      },
      checkIn: '2025-05-25T14:00:00.000Z',
      checkOut: '2025-05-26T12:00:00.000Z',
      actualCheckOut: null,
      rateLabel: 'Qua dem',
      basePrice: '500000.00',
      finalPrice: '550000.00',
      extensionTotalPrice: '150000.00',
      effectiveFinalPrice: '700000.00',
      depositAmount: '200000.00',
      numAdults: 2,
      numChildren: 0,
      source: 'WALK_IN',
      note: 'Khach yeu cau phong tang cao, khong hut thuoc',
      status: 'CONFIRMED',
      extensions: [
        {
          id: 'uuid-ext-001',
          bookingId: 'uuid-booking-001',
          extraHours: 2,
          extraPrice: '150000.00',
          newCheckOut: '2025-05-26T14:00:00.000Z',
          approvedByStaffId: 'uuid-staff-001',
          note: 'Khach xin o them 2 tieng',
          createdAt: '2025-05-26T11:00:00.000Z',
        },
      ],
      createdByStaff: { id: 'uuid-staff-001', position: 'Le tan' },
      createdAt: '2025-05-25T13:45:00.000Z',
    }),
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const actor = await this.getActorContext(userId, role);
    return this.bookingsService.findOne(id, actor);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Update booking status (checkin/checkout/cancel)' })
  @ApiParam({ name: 'id', example: 'uuid-booking-001' })
  @ApiBody({ type: UpdateBookingStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Booking status updated',
    schema: successResponseSchema({
      id: 'uuid-booking-001',
      bookingCode: 'BK-20250525-A3K9',
      status: 'CHECKED_OUT',
      actualCheckOut: '2025-05-26T11:30:00.000Z',
      cancelledAt: null,
      cancelReason: null,
    }),
  })
  @ApiResponse({
    status: 403,
    description: 'Receptionist cannot cancel bookings',
    schema: errorResponseSchema(
      403,
      'Receptionists cannot cancel bookings',
      'FORBIDDEN',
    ),
  })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Req() request: FastifyRequest,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    const actor = await this.getActorContext(userId, role, request.ip, true);
    return this.bookingsService.updateStatus(id, actor, dto);
  }

  @Patch(':id/price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Adjust booking price' })
  @ApiParam({ name: 'id', example: 'uuid-booking-001' })
  @ApiBody({ type: UpdateBookingPriceDto })
  @ApiResponse({
    status: 200,
    description: 'Booking price updated',
    schema: successResponseSchema({
      id: 'uuid-booking-001',
      finalPrice: '450000.00',
      priceNote: 'Giam gia khach quen 10%',
    }),
  })
  async updatePrice(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Req() request: FastifyRequest,
    @Body() dto: UpdateBookingPriceDto,
  ) {
    const actor = await this.getActorContext(userId, role, request.ip, true);
    return this.bookingsService.updatePrice(id, actor, dto);
  }

  private async getActorContext(
    userId: string,
    role: string,
    actorIp?: string,
    requireStaff = false,
  ): Promise<BookingActorContext> {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);

    if (!this.isBranchScopedRole(role) && !requireStaff) {
      return { organizationId, userId, role, actorIp };
    }

    const allowedStaffRoles = requireStaff
      ? ['BRANCH_MANAGER', 'RECEPTIONIST']
      : ['BRANCH_MANAGER', 'RECEPTIONIST'];
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
      actorIp,
    };
  }

  private isBranchScopedRole(role: string) {
    return role === 'BRANCH_MANAGER' || role === 'RECEPTIONIST';
  }
}
