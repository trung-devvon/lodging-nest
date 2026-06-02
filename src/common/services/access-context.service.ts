import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { OrganizationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  isWorkspaceAccessibleStatus,
  requiresOrganizationAccess,
} from '../constants/organization-status';

type UserOrganizationAccess = {
  organizationId: string;
  status: OrganizationStatus;
};

@Injectable()
export class AccessContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationAccessForUser(
    userId: string,
  ): Promise<UserOrganizationAccess | null> {
    const staff = await this.prisma.staff.findFirst({
      where: {
        userId,
        isActive: true,
        organization: { deletedAt: null },
      },
      select: {
        organizationId: true,
        organization: {
          select: {
            status: true,
          },
        },
      },
    });
    if (staff?.organizationId) {
      return {
        organizationId: staff.organizationId,
        status: staff.organization.status,
      };
    }

    const org = await this.prisma.organization.findFirst({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!org) {
      return null;
    }

    return {
      organizationId: org.id,
      status: org.status,
    };
  }

  async ensureWorkspaceAccessOrThrow(userId: string, role?: string | null) {
    if (!requiresOrganizationAccess(role)) {
      return null;
    }

    const organizationAccess = await this.getOrganizationAccessForUser(userId);
    if (!organizationAccess) {
      throw new UnauthorizedException('No organization found');
    }

    if (!isWorkspaceAccessibleStatus(organizationAccess.status)) {
      throw new ForbiddenException('Organization is not active');
    }

    return organizationAccess;
  }

  async getOrganizationIdFromUser(
    userId: string,
    role?: string | null,
  ): Promise<string | null> {
    const organizationAccess = await this.ensureWorkspaceAccessOrThrow(
      userId,
      role,
    );

    return organizationAccess?.organizationId ?? null;
  }

  async getOrganizationIdOrThrow(
    userId: string,
    role?: string | null,
  ): Promise<string> {
    const organizationAccess = await this.ensureWorkspaceAccessOrThrow(
      userId,
      role,
    );
    if (!organizationAccess) {
      throw new UnauthorizedException('No organization found');
    }

    return organizationAccess.organizationId;
  }

  async getActiveStaffOrThrow(
    userId: string,
    organizationId: string,
    allowedStaffRoles?: string[],
  ) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        userId,
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        branchId: true,
        staffRole: true,
      },
    });

    if (!staff) {
      throw new ForbiddenException('Active staff record not found');
    }

    if (
      allowedStaffRoles?.length &&
      !allowedStaffRoles.includes(staff.staffRole)
    ) {
      throw new ForbiddenException('Staff role is not allowed for this action');
    }

    return staff;
  }

  async ensureBranchManagerAccessToBranch(
    userId: string,
    organizationId: string,
    role: string,
    branchId: string,
    resourceLabel = 'resource',
  ) {
    await this.ensureBranchScopedStaffAccessToBranch(
      userId,
      organizationId,
      role,
      branchId,
      resourceLabel,
      ['BRANCH_MANAGER'],
    );
  }

  async ensureBranchScopedStaffAccessToBranch(
    userId: string,
    organizationId: string,
    role: string,
    branchId: string,
    resourceLabel = 'resource',
    scopedRoles = ['BRANCH_MANAGER', 'RECEPTIONIST'],
  ) {
    if (!scopedRoles.includes(role)) return;

    const staff = await this.getActiveStaffOrThrow(
      userId,
      organizationId,
      scopedRoles,
    );

    if (!staff.branchId || staff.branchId !== branchId) {
      throw new ForbiddenException(
        `You can only manage ${resourceLabel} in your assigned branch`,
      );
    }
  }
}
