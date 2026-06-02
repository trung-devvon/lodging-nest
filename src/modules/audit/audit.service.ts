import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditActorContext } from './audit-actor-context.interface';
import { AUDIT_ACTIONS, AUDIT_TARGET_TABLES } from './audit.constants';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

type AuditLogInput = {
  organizationId?: string;
  actorUserId?: string;
  actorIp?: string | null;
  action: string;
  targetTable: string;
  targetId: string;
  oldValue?: unknown;
  newValue?: unknown;
};

type RoomStatusChangeInput = {
  organizationId: string;
  actorUserId?: string;
  actorIp?: string | null;
  roomId: string;
  fromStatus: string;
  toStatus: string;
  source: string;
  bookingId?: string;
  housekeepingTaskId?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: AuditActorContext, query: QueryAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const scopedOrganizationId = this.resolveScopedOrganizationId(actor, query);
    const where: Prisma.AuditLogWhereInput = {};

    if (scopedOrganizationId) {
      where.organizationId = scopedOrganizationId;
    }
    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.targetTable) {
      where.targetTable = query.targetTable;
    }
    if (query.targetId) {
      where.targetId = query.targetId;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          organizationId: true,
          actorUserId: true,
          actorIp: true,
          action: true,
          targetTable: true,
          targetId: true,
          oldValue: true,
          newValue: true,
          createdAt: true,
          actorUser: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit },
    };
  }

  async log(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        actorIp: input.actorIp ?? undefined,
        action: input.action,
        targetTable: input.targetTable,
        targetId: input.targetId,
        oldValue: this.normalizeJsonValue(input.oldValue),
        newValue: this.normalizeJsonValue(input.newValue),
      },
    });
  }

  async logRoomStatusChange(input: RoomStatusChangeInput) {
    if (input.fromStatus === input.toStatus) {
      return;
    }

    return this.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorIp: input.actorIp,
      action: AUDIT_ACTIONS.ROOM_STATUS_CHANGED,
      targetTable: AUDIT_TARGET_TABLES.ROOMS,
      targetId: input.roomId,
      oldValue: {
        status: input.fromStatus,
      },
      newValue: {
        status: input.toStatus,
        source: input.source,
        bookingId: input.bookingId,
        housekeepingTaskId: input.housekeepingTaskId,
      },
    });
  }

  private resolveScopedOrganizationId(
    actor: AuditActorContext,
    query: QueryAuditLogsDto,
  ) {
    if (actor.role === 'SUPER_ADMIN') {
      return query.organizationId;
    }

    if (query.organizationId && query.organizationId !== actor.organizationId) {
      throw new ForbiddenException(
        'You can only access audit logs for your own organization',
      );
    }

    return actor.organizationId;
  }

  private normalizeJsonValue(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return JSON.parse(
      JSON.stringify(value, (_key, currentValue: unknown) => {
        if (currentValue instanceof Prisma.Decimal) {
          return currentValue.toString();
        }

        if (currentValue instanceof Date) {
          return currentValue.toISOString();
        }

        return currentValue;
      }),
    ) as Prisma.InputJsonValue;
  }
}
