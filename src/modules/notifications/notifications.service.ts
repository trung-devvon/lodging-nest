import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: QueryNotificationsDto) {
    const { page = 1, limit = 20, isRead } = query;
    const skip = (page - 1) * limit;

    const where: any = { recipientUserId: userId };
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientUserId: userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientUserId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }
}
