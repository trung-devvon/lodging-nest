import { Test, TestingModule } from '@nestjs/testing';
import { AccessContextService } from '../../common/services/access-context.service';
import { HousekeepingController } from './housekeeping.controller';
import { HousekeepingService } from './housekeeping.service';

describe('HousekeepingController', () => {
  let controller: HousekeepingController;
  let housekeepingService: {
    create: jest.Mock;
    findAll: jest.Mock;
    updateStatus: jest.Mock;
    assign: jest.Mock;
  };
  let accessContextService: {
    getOrganizationIdOrThrow: jest.Mock;
    getActiveStaffOrThrow: jest.Mock;
  };

  beforeEach(async () => {
    housekeepingService = {
      create: jest.fn(),
      findAll: jest.fn(),
      updateStatus: jest.fn(),
      assign: jest.fn(),
    };
    accessContextService = {
      getOrganizationIdOrThrow: jest.fn(),
      getActiveStaffOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousekeepingController],
      providers: [
        {
          provide: HousekeepingService,
          useValue: housekeepingService,
        },
        {
          provide: AccessContextService,
          useValue: accessContextService,
        },
      ],
    }).compile();

    controller = module.get<HousekeepingController>(HousekeepingController);
  });

  it('uses access context helpers before creating a housekeeping task', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    accessContextService.getActiveStaffOrThrow.mockResolvedValue({
      id: 'staff-1',
      branchId: 'branch-1',
      staffRole: 'BRANCH_MANAGER',
    });
    housekeepingService.create.mockResolvedValue({ id: 'task-1' });

    await controller.create('user-1', 'BRANCH_MANAGER', {
      roomId: 'room-1',
      taskType: 'DEEP_CLEAN',
      scheduledDate: '2025-05-26',
      scheduledTime: '10:00',
    });

    expect(accessContextService.getOrganizationIdOrThrow).toHaveBeenCalledWith(
      'user-1',
    );
    expect(accessContextService.getActiveStaffOrThrow).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      ['BRANCH_MANAGER'],
    );
    expect(housekeepingService.create).toHaveBeenCalledWith(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'BRANCH_MANAGER',
        staffId: 'staff-1',
        branchId: 'branch-1',
        staffRole: 'BRANCH_MANAGER',
      },
      expect.objectContaining({
        roomId: 'room-1',
      }),
    );
  });
});
