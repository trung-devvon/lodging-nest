import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
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
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@ApiTags('Audit')
@Controller('audit-logs')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly accessContextService: AccessContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ORG_OWNER')
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'List audit logs' })
  @ApiQuery({ name: 'organizationId', required: false, example: 'uuid-org-001' })
  @ApiQuery({ name: 'actorUserId', required: false, example: 'uuid-user-001' })
  @ApiQuery({ name: 'action', required: false, example: 'BOOKING_CANCELLED' })
  @ApiQuery({ name: 'targetTable', required: false, example: 'bookings' })
  @ApiQuery({ name: 'targetId', required: false, example: 'uuid-booking-001' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of audit logs',
    schema: successResponseSchema(
      [
        {
          id: 'uuid-audit-001',
          organizationId: 'uuid-org-001',
          actorUserId: 'uuid-user-001',
          actorIp: '127.0.0.1',
          actorUser: {
            id: 'uuid-user-001',
            email: 'owner@annhien.com',
            role: 'ORG_OWNER',
          },
          action: 'BOOKING_CANCELLED',
          targetTable: 'bookings',
          targetId: 'uuid-booking-001',
          oldValue: {
            status: 'CONFIRMED',
          },
          newValue: {
            status: 'CANCELLED',
            cancelReason: 'Khach doi lich',
          },
          createdAt: '2026-06-01T02:30:00.000Z',
        },
      ],
      { total: 12, page: 1, limit: 20 },
    ),
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: QueryAuditLogsDto,
  ) {
    const organizationId =
      role === 'ORG_OWNER'
        ? await this.accessContextService.getOrganizationIdOrThrow(userId)
        : undefined;

    return this.auditService.findAll(
      {
        userId,
        role,
        organizationId,
      },
      query,
    );
  }
}
