import { Test, TestingModule } from '@nestjs/testing';
import { AccessContextService } from '../../common/services/access-context.service';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

describe('StaffController', () => {
  let controller: StaffController;
  let staffService: {
    create: jest.Mock;
    findAll: jest.Mock;
  };
  let accessContextService: {
    getOrganizationIdOrThrow: jest.Mock;
  };

  beforeEach(async () => {
    staffService = {
      create: jest.fn(),
      findAll: jest.fn(),
    };
    accessContextService = {
      getOrganizationIdOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [
        {
          provide: StaffService,
          useValue: staffService,
        },
        {
          provide: AccessContextService,
          useValue: accessContextService,
        },
      ],
    }).compile();

    controller = module.get<StaffController>(StaffController);
  });

  it('uses access context before creating staff', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    staffService.create.mockResolvedValue({ id: 'staff-1' });

    await controller.create('user-1', {
      email: 'staff@example.com',
      password: 'Staff@123456',
      position: 'Le tan',
      staffRole: 'RECEPTIONIST' as any,
    });

    expect(accessContextService.getOrganizationIdOrThrow).toHaveBeenCalledWith(
      'user-1',
    );
    expect(staffService.create).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        email: 'staff@example.com',
      }),
    );
  });

  it('passes user role into staff listing for branch scoping', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    staffService.findAll.mockResolvedValue([]);

    await controller.findAll('user-1', 'BRANCH_MANAGER', {
      branchId: 'branch-1',
    });

    expect(staffService.findAll).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'BRANCH_MANAGER',
      { branchId: 'branch-1' },
    );
  });
});
