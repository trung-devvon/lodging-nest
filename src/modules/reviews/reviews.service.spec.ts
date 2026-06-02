import { ForbiddenException } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessContextService } from '../../common/services/access-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;
  let accessContextService: {
    getActiveStaffOrThrow: jest.Mock;
    ensureBranchManagerAccessToBranch: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      review: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (queries: any[]) =>
      Promise.all(queries),
    );

    accessContextService = {
      getActiveStaffOrThrow: jest.fn(),
      ensureBranchManagerAccessToBranch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AccessContextService,
          useValue: accessContextService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('limits branch managers to their assigned branch when listing reviews', async () => {
    accessContextService.getActiveStaffOrThrow.mockResolvedValue({
      id: 'staff-1',
      branchId: 'branch-1',
      staffRole: StaffRole.BRANCH_MANAGER,
    });
    prisma.review.findMany.mockResolvedValue([
      {
        id: 'review-1',
        rating: 5,
        comment: 'Great',
        replyFromStaff: null,
        repliedAt: null,
        isPublished: true,
        createdAt: new Date('2025-05-21T09:00:00.000Z'),
        booking: {
          bookingCode: 'BK-1',
          checkIn: new Date('2025-05-20T14:00:00.000Z'),
        },
        guestProfile: { fullName: 'Guest 1' },
        room: { name: 'Room 101' },
      },
    ]);
    prisma.review.count.mockResolvedValue(1);

    const result = await service.findAll(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'BRANCH_MANAGER',
      },
      {},
    );

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          branch: {
            organizationId: 'org-1',
            deletedAt: null,
          },
          branchId: 'branch-1',
        },
      }),
    );
    expect(result).toEqual({
      data: [
        {
          id: 'review-1',
          rating: 5,
          comment: 'Great',
          replyFromStaff: null,
          repliedAt: null,
          isPublished: true,
          createdAt: new Date('2025-05-21T09:00:00.000Z'),
          booking: {
            bookingCode: 'BK-1',
            checkIn: new Date('2025-05-20T14:00:00.000Z'),
          },
          guest: { fullName: 'Guest 1' },
          room: { name: 'Room 101' },
        },
      ],
      meta: { total: 1, page: 1, limit: 20 },
    });
  });

  it('rejects branch managers requesting another branch', async () => {
    accessContextService.getActiveStaffOrThrow.mockResolvedValue({
      id: 'staff-1',
      branchId: 'branch-1',
      staffRole: StaffRole.BRANCH_MANAGER,
    });

    await expect(
      service.findAll(
        {
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'BRANCH_MANAGER',
        },
        { branchId: 'branch-2' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows org owners to reply without requiring a staff profile', async () => {
    prisma.review.findFirst.mockResolvedValue({
      id: 'review-1',
      branchId: 'branch-1',
    });
    prisma.review.update.mockResolvedValue({
      id: 'review-1',
      replyFromStaff: 'Thanks',
      repliedAt: new Date('2025-05-21T10:00:00.000Z'),
    });

    await service.reply(
      {
        organizationId: 'org-1',
        userId: 'owner-1',
        role: 'ORG_OWNER',
      },
      'review-1',
      { replyFromStaff: 'Thanks' },
    );

    expect(accessContextService.ensureBranchManagerAccessToBranch).toHaveBeenCalledWith(
      'owner-1',
      'org-1',
      'ORG_OWNER',
      'branch-1',
      'reviews',
    );
    expect(accessContextService.getActiveStaffOrThrow).not.toHaveBeenCalled();
    expect(prisma.review.update).toHaveBeenCalledWith({
      where: { id: 'review-1' },
      data: {
        replyFromStaff: 'Thanks',
        repliedByStaffId: null,
        repliedAt: expect.any(Date),
      },
      select: {
        id: true,
        replyFromStaff: true,
        repliedAt: true,
      },
    });
  });
});
