import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { ToggleStaffActiveDto } from './dto/toggle-staff-active.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateStaffDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) throw new ConflictException('Email already in use');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        phone: dto.phone,
        role: this.mapStaffRoleToUserRole(dto.staffRole),
      },
    });

    return this.prisma.staff.create({
      data: {
        userId: user.id,
        organizationId,
        branchId: dto.branchId,
        position: dto.position,
        staffRole: dto.staffRole,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
      },
      include: {
        user: { select: { id: true, email: true, phone: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(organizationId: string, query: QueryStaffDto) {
    const where: any = { organizationId };
    if (query.branchId) where.branchId = query.branchId;
    if (query.staffRole) where.staffRole = query.staffRole;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

    return this.prisma.staff.findMany({
      where,
      select: {
        id: true,
        user: { select: { email: true, phone: true } },
        branch: { select: { name: true } },
        position: true,
        staffRole: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateStaffDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, organizationId },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const data: any = {};
    if (dto.position) data.position = dto.position;
    if (dto.staffRole) data.staffRole = dto.staffRole;
    if (dto.branchId) data.branchId = dto.branchId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.phone) {
      await this.prisma.user.update({
        where: { id: staff.userId },
        data: { phone: dto.phone },
      });
    }

    return this.prisma.staff.update({
      where: { id },
      data,
      select: {
        id: true,
        user: { select: { email: true, phone: true } },
        branch: { select: { id: true, name: true } },
        position: true,
        staffRole: true,
        isActive: true,
      },
    });
  }

  async toggleActive(id: string, organizationId: string, dto: ToggleStaffActiveDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, organizationId },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    return this.prisma.staff.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: { id: true, user: { select: { email: true } }, isActive: true },
    });
  }

  private mapStaffRoleToUserRole(staffRole: string): UserRole {
    const map: Record<string, UserRole> = {
      ORG_MANAGER: UserRole.ORG_MANAGER,
      BRANCH_MANAGER: UserRole.BRANCH_MANAGER,
      RECEPTIONIST: UserRole.RECEPTIONIST,
      HOUSEKEEPER: UserRole.HOUSEKEEPER,
      ACCOUNTANT: UserRole.RECEPTIONIST,
    };
    return map[staffRole] ?? UserRole.RECEPTIONIST;
  }
}
