import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: {
    findAll: jest.Mock;
    markAllAsRead: jest.Mock;
    markAsRead: jest.Mock;
  };

  beforeEach(async () => {
    notificationsService = {
      findAll: jest.fn(),
      markAllAsRead: jest.fn(),
      markAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('forwards filters to notifications service', async () => {
    notificationsService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll('user-1', { isRead: false, page: 2, limit: 10 });

    expect(notificationsService.findAll).toHaveBeenCalledWith('user-1', {
      isRead: false,
      page: 2,
      limit: 10,
    });
  });

  it('forwards read-all to notifications service', async () => {
    notificationsService.markAllAsRead.mockResolvedValue({ updatedCount: 2 });

    await controller.markAllAsRead('user-1');

    expect(notificationsService.markAllAsRead).toHaveBeenCalledWith('user-1');
  });
});
