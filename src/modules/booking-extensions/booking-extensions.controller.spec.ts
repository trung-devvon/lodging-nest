import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AccessContextService } from '../../common/services/access-context.service';
import { BookingExtensionsController } from './booking-extensions.controller';
import { BookingExtensionsService } from './booking-extensions.service';

describe('BookingExtensionsController', () => {
  let controller: BookingExtensionsController;
  let bookingExtensionsService: {
    create: jest.Mock;
    findAll: jest.Mock;
  };
  let accessContextService: {
    getOrganizationIdOrThrow: jest.Mock;
    getActiveStaffOrThrow: jest.Mock;
  };

  beforeEach(async () => {
    bookingExtensionsService = {
      create: jest.fn(),
      findAll: jest.fn(),
    };
    accessContextService = {
      getOrganizationIdOrThrow: jest.fn(),
      getActiveStaffOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingExtensionsController],
      providers: [
        {
          provide: BookingExtensionsService,
          useValue: bookingExtensionsService,
        },
        {
          provide: AccessContextService,
          useValue: accessContextService,
        },
      ],
    }).compile();

    controller = module.get<BookingExtensionsController>(
      BookingExtensionsController,
    );
  });

  it('uses access context helpers before creating an extension', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    accessContextService.getActiveStaffOrThrow.mockResolvedValue({
      id: 'staff-1',
      branchId: 'branch-1',
    });
    bookingExtensionsService.create.mockResolvedValue({ id: 'ext-1' });

    await controller.create('booking-1', 'user-1', 'RECEPTIONIST', {
      extraHours: 2,
      extraPrice: new Prisma.Decimal('150000.00'),
      note: 'Khach o them',
    });

    expect(accessContextService.getOrganizationIdOrThrow).toHaveBeenCalledWith(
      'user-1',
    );
    expect(accessContextService.getActiveStaffOrThrow).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      ['BRANCH_MANAGER', 'RECEPTIONIST'],
    );
    expect(bookingExtensionsService.create).toHaveBeenCalledWith(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'RECEPTIONIST',
        staffId: 'staff-1',
        branchId: 'branch-1',
      },
      'booking-1',
      expect.objectContaining({
        extraHours: 2,
      }),
    );
  });

  it('does not require a staff lookup for org-level users when listing extensions', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    bookingExtensionsService.findAll.mockResolvedValue([]);

    await controller.findAll('booking-1', 'user-1', 'ORG_OWNER');

    expect(accessContextService.getActiveStaffOrThrow).not.toHaveBeenCalled();
    expect(bookingExtensionsService.findAll).toHaveBeenCalledWith(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'ORG_OWNER',
      },
      'booking-1',
    );
  });
});
