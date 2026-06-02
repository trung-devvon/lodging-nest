import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { BookingExtensionsService } from './booking-extensions.service';
import { CreateExtensionDto } from './dto/create-extension.dto';
import { BookingActorContext } from '../bookings/booking-actor-context.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessContextService } from '../../common/services/access-context.service';
import {
  errorResponseSchema,
  successResponseSchema,
} from '../../common/swagger/response-schema.util';

@ApiTags('Booking Extensions')
@Controller('bookings/:bookingId/extensions')
export class BookingExtensionsController {
  constructor(
    private readonly bookingExtensionsService: BookingExtensionsService,
    private readonly accessContextService: AccessContextService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Extend a booking' })
  @ApiParam({ name: 'bookingId', example: 'uuid-booking-001' })
  @ApiBody({ type: CreateExtensionDto })
  @ApiResponse({
    status: 201,
    description: 'Extension created',
    schema: successResponseSchema({
      id: 'uuid-ext-001',
      bookingId: 'uuid-booking-001',
      extraHours: 2,
      extraPrice: '150000.00',
      newCheckOut: '2025-05-26T14:00:00.000Z',
      createdAt: '2025-05-26T11:00:00.000Z',
      priceSummary: {
        bookingFinalPrice: '550000.00',
        extensionTotalPrice: '150000.00',
        effectiveFinalPrice: '700000.00',
      },
    }),
  })
  @ApiResponse({
    status: 409,
    description: 'Extension conflicts with next booking or buffer time',
    schema: errorResponseSchema(
      409,
      'Cannot extend. Next booking starts at 2025-05-26T15:00:00.000Z. Max extension: 1 hour(s).',
      'EXTENSION_CONFLICT',
    ),
  })
  async create(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateExtensionDto,
  ) {
    const actor = await this.getActorContext(userId, role, true);
    return this.bookingExtensionsService.create(actor, bookingId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List extensions of a booking' })
  @ApiParam({ name: 'bookingId', example: 'uuid-booking-001' })
  @ApiResponse({
    status: 200,
    description: 'List of extensions',
    schema: successResponseSchema([
      {
        id: 'uuid-ext-001',
        extraHours: 2,
        extraPrice: '150000.00',
        newCheckOut: '2025-05-26T14:00:00.000Z',
        approvedByStaff: { position: 'Le tan' },
        createdAt: '2025-05-26T11:00:00.000Z',
      },
    ]),
  })
  async findAll(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const actor = await this.getActorContext(userId, role);
    return this.bookingExtensionsService.findAll(actor, bookingId);
  }

  private async getActorContext(
    userId: string,
    role: string,
    requireStaff = false,
  ): Promise<BookingActorContext> {
    const organizationId =
      await this.accessContextService.getOrganizationIdOrThrow(userId);

    if (!this.isBranchScopedRole(role) && !requireStaff) {
      return { organizationId, userId, role };
    }

    const staff = await this.accessContextService.getActiveStaffOrThrow(
      userId,
      organizationId,
      ['BRANCH_MANAGER', 'RECEPTIONIST'],
    );

    return {
      organizationId,
      userId,
      role,
      staffId: staff.id,
      branchId: staff.branchId,
    };
  }

  private isBranchScopedRole(role: string) {
    return role === 'BRANCH_MANAGER' || role === 'RECEPTIONIST';
  }
}
