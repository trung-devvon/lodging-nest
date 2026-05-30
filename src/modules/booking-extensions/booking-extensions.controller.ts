import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingExtensionsService } from './booking-extensions.service';
import { CreateExtensionDto } from './dto/create-extension.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BranchesService } from '../branches/branches.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Booking Extensions')
@Controller('bookings/:bookingId/extensions')
export class BookingExtensionsController {
  constructor(
    private readonly bookingExtensionsService: BookingExtensionsService,
    private readonly branchesService: BranchesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRANCH_MANAGER', 'RECEPTIONIST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extend a booking' })
  @ApiResponse({ status: 201, description: 'Extension created' })
  async create(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExtensionDto,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    const staff = await this.prisma.staff.findFirst({ where: { userId } });
    return this.bookingExtensionsService.create(orgId, staff?.id ?? '', bookingId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List extensions of a booking' })
  @ApiResponse({ status: 200, description: 'List of extensions' })
  async findAll(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
  ) {
    const orgId = await this.branchesService.getOrganizationIdFromUser(userId);
    if (!orgId) throw new UnauthorizedException('No organization found');
    return this.bookingExtensionsService.findAll(orgId, bookingId);
  }
}
