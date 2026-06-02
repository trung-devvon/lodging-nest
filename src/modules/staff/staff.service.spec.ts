import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StaffRole, UserRole } from '@prisma/client';
import { AccessContextService } from '../../common/services/access-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffService } from './staff.service';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('StaffService', () => {
  let service: StaffService;
  let prisma: any;
  let accessContextService: {
    getActiveStaffOrThrow: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      branch: {
        findFirst: jest.fn(),
      },
      staff: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );

    accessContextService = {
      getActiveStaffOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
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

    service = module.get<StaffService>(StaffService);
  });

  it('limits branch managers to staff in their assigned branch', async () => {
    accessContextService.getActiveStaffOrThrow.mockResolvedValue({
      id: 'staff-1',
      branchId: 'branch-1',
      staffRole: StaffRole.BRANCH_MANAGER,
    });
    prisma.staff.findMany.mockResolvedValue([]);

    await service.findAll('org-1', 'user-1', UserRole.BRANCH_MANAGER, {});

    expect(accessContextService.getActiveStaffOrThrow).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      [StaffRole.BRANCH_MANAGER],
    );
    expect(prisma.staff.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          branchId: 'branch-1',
        }),
      }),
    );
  });

  it('rejects branch managers requesting another branch', async () => {
    accessContextService.getActiveStaffOrThrow.mockResolvedValue({
      id: 'staff-1',
      branchId: 'branch-1',
      staffRole: StaffRole.BRANCH_MANAGER,
    });

    await expect(
      service.findAll('org-1', 'user-1', UserRole.BRANCH_MANAGER, {
        branchId: 'branch-2',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates user role when staffRole changes', async () => {
    prisma.staff.findFirst.mockResolvedValue({
      id: 'staff-1',
      userId: 'user-1',
      branchId: 'branch-1',
      staffRole: StaffRole.RECEPTIONIST,
    });
    prisma.branch.findFirst.mockResolvedValue({ id: 'branch-1' });
    prisma.staff.update.mockResolvedValue({ id: 'staff-1' });

    await service.update('staff-1', 'org-1', {
      staffRole: StaffRole.BRANCH_MANAGER,
      branchId: 'branch-1',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: UserRole.BRANCH_MANAGER },
    });
    expect(prisma.staff.update).toHaveBeenCalled();
  });

  it('syncs user isActive when toggling staff active state', async () => {
    prisma.staff.findFirst.mockResolvedValue({
      id: 'staff-1',
      userId: 'user-1',
    });
    prisma.staff.update.mockResolvedValue({
      id: 'staff-1',
      user: { email: 'staff@example.com', isActive: false },
      isActive: false,
    });

    await service.toggleActive('staff-1', 'org-1', { isActive: false });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { isActive: false },
    });
    expect(prisma.staff.update).toHaveBeenCalledWith({
      where: { id: 'staff-1' },
      data: { isActive: false },
      select: {
        id: true,
        user: {
          select: {
            email: true,
            isActive: true,
          },
        },
        isActive: true,
      },
    });
  });

  it('rejects ACCOUNTANT because auth has no dedicated user role', async () => {
    await expect(
      service.create('org-1', {
        email: 'accountant@example.com',
        password: 'Staff@123456',
        position: 'Accountant',
        staffRole: StaffRole.ACCOUNTANT,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
