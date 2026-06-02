import { Test, TestingModule } from '@nestjs/testing';
import { AccessContextService } from '../../common/services/access-context.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

describe('BookingsController', () => {
  let controller: BookingsController;
  let bookingsService: { create: jest.Mock };
  let accessContextService: {
    getOrganizationIdOrThrow: jest.Mock;
    getActiveStaffOrThrow: jest.Mock;
  };

  beforeEach(async () => {
    bookingsService = {
      create: jest.fn(),
    };
    accessContextService = {
      getOrganizationIdOrThrow: jest.fn(),
      getActiveStaffOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: bookingsService,
        },
        {
          provide: AccessContextService,
          useValue: accessContextService,
        },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
  });

  it('uses access context helpers before creating a booking', async () => {
    accessContextService.getOrganizationIdOrThrow.mockResolvedValue('org-1');
    accessContextService.getActiveStaffOrThrow.mockResolvedValue({
      id: 'staff-1',
    });
    bookingsService.create.mockResolvedValue({ id: 'booking-1' });

    await controller.create('user-1', 'RECEPTIONIST', {
      roomId: 'room-1',
      guestProfileId: 'guest-1',
      checkIn: '2025-05-24T14:00:00Z',
      checkOut: '2025-05-25T12:00:00Z',
      rateId: 'rate-1',
      numAdults: 2,
      source: 'WALK_IN',
    });

    expect(accessContextService.getOrganizationIdOrThrow).toHaveBeenCalledWith(
      'user-1',
    );
    expect(accessContextService.getActiveStaffOrThrow).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      ['BRANCH_MANAGER', 'RECEPTIONIST'],
    );
    expect(bookingsService.create).toHaveBeenCalledWith(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'RECEPTIONIST',
        staffId: 'staff-1',
        branchId: undefined,
      },
      expect.objectContaining({
        roomId: 'room-1',
        guestProfileId: 'guest-1',
      }),
    );
  });
});
