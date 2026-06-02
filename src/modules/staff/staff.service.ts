import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffRole, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { AccessContextService } from '../../common/services/access-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { ToggleStaffActiveDto } from './dto/toggle-staff-active.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessContextService: AccessContextService,
  ) {}

  async create(organizationId: string, dto: CreateStaffDto) {
    this.ensureSupportedStaffRole(dto.staffRole);
    await this.ensureValidBranchAssignment(
      organizationId,
      dto.staffRole,
      dto.branchId,
    );

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) throw new ConflictException('Email already in use');

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          phone: dto.phone,
          role: this.mapStaffRoleToUserRole(dto.staffRole),
        },
      });

      return tx.staff.create({
        data: {
          userId: user.id,
          organizationId,
          branchId: dto.branchId,
          position: dto.position,
          staffRole: dto.staffRole,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
        },
        select: this.staffDetailSelect(),
      });
    });
  }

  async findAll(
    organizationId: string,
    userId: string,
    role: string,
    query: QueryStaffDto,
  ) {
    let branchId = query.branchId;

    if (role === UserRole.BRANCH_MANAGER) {
      const staff = await this.accessContextService.getActiveStaffOrThrow(
        userId,
        organizationId,
        [StaffRole.BRANCH_MANAGER],
      );

      if (!staff.branchId) {
        throw new ForbiddenException(
          'Active branch assignment is required for this action',
        );
      }

      if (branchId && branchId !== staff.branchId) {
        throw new ForbiddenException(
          'You can only view staff in your assigned branch',
        );
      }

      branchId = staff.branchId;
    }

    const where: {
      organizationId: string;
      branchId?: string;
      staffRole?: StaffRole;
      isActive?: boolean;
    } = { organizationId };

    if (branchId) where.branchId = branchId;
    if (query.staffRole) where.staffRole = query.staffRole;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return this.prisma.staff.findMany({
      where,
      select: this.staffDetailSelect(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateStaffDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        userId: true,
        branchId: true,
        staffRole: true,
      },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const nextStaffRole = dto.staffRole ?? staff.staffRole;
    const nextBranchId =
      dto.branchId !== undefined ? dto.branchId : (staff.branchId ?? undefined);

    this.ensureSupportedStaffRole(nextStaffRole);
    await this.ensureValidBranchAssignment(
      organizationId,
      nextStaffRole,
      nextBranchId,
    );

    const userData: {
      phone?: string;
      role?: UserRole;
      isActive?: boolean;
    } = {};
    if (dto.phone !== undefined) userData.phone = dto.phone;
    if (dto.staffRole) {
      userData.role = this.mapStaffRoleToUserRole(dto.staffRole);
    }
    if (dto.isActive !== undefined) {
      userData.isActive = dto.isActive;
    }

    const staffData: {
      position?: string;
      staffRole?: StaffRole;
      branchId?: string;
      isActive?: boolean;
    } = {};
    if (dto.position !== undefined) staffData.position = dto.position;
    if (dto.staffRole !== undefined) staffData.staffRole = dto.staffRole;
    if (dto.branchId !== undefined) staffData.branchId = dto.branchId;
    if (dto.isActive !== undefined) staffData.isActive = dto.isActive;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: staff.userId },
          data: userData,
        });
      }

      return tx.staff.update({
        where: { id },
        data: staffData,
        select: this.staffDetailSelect(),
      });
    });
  }

  async toggleActive(
    id: string,
    organizationId: string,
    dto: ToggleStaffActiveDto,
  ) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, organizationId },
      select: { id: true, userId: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: staff.userId },
        data: { isActive: dto.isActive },
      });

      return tx.staff.update({
        where: { id },
        data: { isActive: dto.isActive },
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
  }

  private async ensureValidBranchAssignment(
    organizationId: string,
    staffRole: StaffRole,
    branchId?: string,
  ) {
    if (this.requiresBranchAssignment(staffRole) && !branchId) {
      throw new BadRequestException(
        'branchId is required for branch-scoped staff roles',
      );
    }

    if (!branchId) {
      return;
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException('Branch not found');
    }
  }

  private requiresBranchAssignment(staffRole: StaffRole) {
    const branchScopedRoles: StaffRole[] = [
      StaffRole.BRANCH_MANAGER,
      StaffRole.RECEPTIONIST,
      StaffRole.HOUSEKEEPER,
    ];
    return branchScopedRoles.includes(staffRole);
  }

  private ensureSupportedStaffRole(staffRole: StaffRole) {
    if (staffRole === StaffRole.ACCOUNTANT) {
      throw new BadRequestException(
        'ACCOUNTANT is not supported until a dedicated user role is available',
      );
    }
  }

  private mapStaffRoleToUserRole(staffRole: StaffRole): UserRole {
    const map: Record<Exclude<StaffRole, 'ACCOUNTANT'>, UserRole> = {
      ORG_MANAGER: UserRole.ORG_MANAGER,
      BRANCH_MANAGER: UserRole.BRANCH_MANAGER,
      RECEPTIONIST: UserRole.RECEPTIONIST,
      HOUSEKEEPER: UserRole.HOUSEKEEPER,
    };

    return map[staffRole as Exclude<StaffRole, 'ACCOUNTANT'>];
  }

  private staffDetailSelect() {
    return {
      id: true,
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      position: true,
      staffRole: true,
      hireDate: true,
      terminatedDate: true,
      isActive: true,
    } as const;
  }
}
