import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AccessContextService } from './access-context.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AccessContextService', () => {
  let service: AccessContextService;
  let prismaService: {
    staff: { findFirst: jest.Mock };
    organization: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prismaService = {
      staff: { findFirst: jest.fn() },
      organization: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessContextService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<AccessContextService>(AccessContextService);
  });

  it('throws when user does not belong to any organization', async () => {
    prismaService.staff.findFirst.mockResolvedValue(null);
    prismaService.organization.findFirst.mockResolvedValue(null);

    await expect(service.getOrganizationIdOrThrow('user-1')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('blocks users whose organization is pending approval', async () => {
    prismaService.staff.findFirst.mockResolvedValue(null);
    prismaService.organization.findFirst.mockResolvedValue({
      id: 'org-1',
      status: 'PENDING_APPROVAL',
    });

    await expect(service.getOrganizationIdOrThrow('user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('blocks branch manager from managing another branch', async () => {
    prismaService.staff.findFirst.mockResolvedValue({ branchId: 'branch-2' });

    await expect(
      service.ensureBranchManagerAccessToBranch(
        'user-1',
        'org-1',
        'BRANCH_MANAGER',
        'branch-1',
        'room rates',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns active staff membership when available', async () => {
    prismaService.staff.findFirst.mockResolvedValue({
      id: 'staff-1',
      branchId: 'branch-1',
      staffRole: 'RECEPTIONIST',
    });

    await expect(
      service.getActiveStaffOrThrow('user-1', 'org-1', ['RECEPTIONIST']),
    ).resolves.toEqual({
      id: 'staff-1',
      branchId: 'branch-1',
      staffRole: 'RECEPTIONIST',
    });
  });

  it('blocks receptionist from managing another branch', async () => {
    prismaService.staff.findFirst.mockResolvedValue({
      id: 'staff-1',
      branchId: 'branch-2',
      staffRole: 'RECEPTIONIST',
    });

    await expect(
      service.ensureBranchScopedStaffAccessToBranch(
        'user-1',
        'org-1',
        'RECEPTIONIST',
        'branch-1',
        'bookings',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
