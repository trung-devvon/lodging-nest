import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { successResponseSchema } from '../../common/swagger/response-schema.util';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiQuery({ name: 'isRead', required: false, example: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated notifications',
    schema: successResponseSchema(
      [
        {
          id: 'uuid-notif-001',
          type: 'BOOKING_NEW',
          title: 'Dat phong moi',
          body: 'Nguyen Van An vua dat Phong Deluxe 101',
          data: {
            bookingId: 'uuid-booking-001',
            roomId: 'uuid-room-001',
            branchId: 'uuid-branch-001',
          },
          isRead: false,
          readAt: null,
          createdAt: '2025-05-25T13:45:00.000Z',
        },
      ],
      { total: 8, page: 1, limit: 20 },
    ),
  })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.findAll(userId, query);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All marked as read',
    schema: successResponseSchema({
      updatedCount: 8,
    }),
  })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', example: 'uuid-notif-001' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    schema: successResponseSchema({
      id: 'uuid-notif-001',
      isRead: true,
      readAt: '2025-05-25T14:00:00.000Z',
    }),
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }
}
