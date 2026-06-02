import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (queries: any[]) =>
      Promise.all(queries),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('returns notifications with meta pagination and boolean read filter', async () => {
    prisma.notification.findMany.mockResolvedValue([
      {
        id: 'notif-1',
        type: 'BOOKING_NEW',
        title: 'Dat phong moi',
        body: 'Body',
        data: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2025-05-25T13:45:00.000Z'),
      },
    ]);
    prisma.notification.count.mockResolvedValue(1);

    const result = await service.findAll('user-1', {
      isRead: false,
      page: 1,
      limit: 20,
    });

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { recipientUserId: 'user-1', isRead: false },
      skip: 0,
      take: 20,
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
    });
    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: 'notif-1',
          isRead: false,
        }),
      ],
      meta: { total: 1, page: 1, limit: 20 },
    });
  });

  it('marks only owned notifications as read', async () => {
    prisma.notification.findFirst.mockResolvedValue({ id: 'notif-1' });
    prisma.notification.update.mockResolvedValue({
      id: 'notif-1',
      isRead: true,
      readAt: new Date('2025-05-25T14:00:00.000Z'),
    });

    await service.markAsRead('notif-1', 'user-1');

    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'notif-1', recipientUserId: 'user-1' },
      select: { id: true },
    });
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: {
        isRead: true,
        readAt: expect.any(Date),
      },
      select: {
        id: true,
        isRead: true,
        readAt: true,
      },
    });
  });

  it('throws when trying to mark another user notification as read', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(service.markAsRead('notif-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns updatedCount when marking all notifications as read', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });

    const result = await service.markAllAsRead('user-1');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { recipientUserId: 'user-1', isRead: false },
      data: { isRead: true, readAt: expect.any(Date) },
    });
    expect(result).toEqual({ updatedCount: 3 });
  });
});
