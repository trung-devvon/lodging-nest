import { Injectable } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type HousekeepingTaskSummary = {
  taskType: TaskType;
  status: TaskStatus;
  scheduledDate: Date;
  scheduledTime?: string | null;
};

@Injectable()
export class HousekeepingDispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async findBestHousekeeper(branchId: string) {
    const housekeepers = await this.prisma.staff.findMany({
      where: {
        branchId,
        isActive: true,
        staffRole: 'HOUSEKEEPER',
      },
      select: { id: true, position: true },
    });

    if (housekeepers.length === 0) {
      return null;
    }

    const openTasks = await this.prisma.housekeepingTask.findMany({
      where: {
        branchId,
        assignedToStaffId: { in: housekeepers.map((staff) => staff.id) },
        status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
      },
      select: { assignedToStaffId: true },
    });

    const loadByStaffId = new Map<string, number>();
    for (const task of openTasks) {
      if (!task.assignedToStaffId) continue;
      loadByStaffId.set(
        task.assignedToStaffId,
        (loadByStaffId.get(task.assignedToStaffId) ?? 0) + 1,
      );
    }

    return [...housekeepers].sort((left, right) => {
      const leftLoad = loadByStaffId.get(left.id) ?? 0;
      const rightLoad = loadByStaffId.get(right.id) ?? 0;
      if (leftLoad !== rightLoad) {
        return leftLoad - rightLoad;
      }

      return left.id.localeCompare(right.id);
    })[0];
  }

  getTaskPriority(taskType: TaskType, status: TaskStatus) {
    if (
      taskType === TaskType.CHECKOUT_CLEAN &&
      status !== TaskStatus.DONE &&
      status !== TaskStatus.SKIPPED
    ) {
      return 'HIGH' as const;
    }

    return 'NORMAL' as const;
  }

  sortTasksByPriority<T extends HousekeepingTaskSummary>(tasks: T[]) {
    return [...tasks].sort((left, right) => {
      const leftPriority = this.getPriorityRank(left.taskType, left.status);
      const rightPriority = this.getPriorityRank(right.taskType, right.status);
      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      const scheduledDateDiff =
        left.scheduledDate.getTime() - right.scheduledDate.getTime();
      if (scheduledDateDiff !== 0) {
        return scheduledDateDiff;
      }

      return (left.scheduledTime ?? '').localeCompare(
        right.scheduledTime ?? '',
      );
    });
  }

  formatScheduledTime(date: Date | null | undefined) {
    if (!date) return undefined;

    return `${String(date.getUTCHours()).padStart(2, '0')}:${String(
      date.getUTCMinutes(),
    ).padStart(2, '0')}`;
  }

  private getPriorityRank(taskType: TaskType, status: TaskStatus) {
    return this.getTaskPriority(taskType, status) === 'HIGH' ? 1 : 0;
  }
}
