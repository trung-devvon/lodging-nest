import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: QueryNotificationsDto) {
    const { page = 1, limit = 20, isRead } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = { recipientUserId: userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          data: true,
          isRead: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit },
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientUserId: userId },
      select: { id: true },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: {
        id: true,
        isRead: true,
        readAt: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientUserId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { updatedCount: result.count };
  }
}
