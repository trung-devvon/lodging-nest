import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateHousekeepingDto {
  @ApiProperty({ example: 'uuid-room-001' })
  @IsString()
  roomId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({ example: 'uuid-staff-002' })
  @IsString()
  @IsOptional()
  assignedToStaffId?: string;

  @ApiProperty({ enum: TaskType, example: 'DEEP_CLEAN' })
  @IsEnum(TaskType)
  taskType: TaskType;

  @ApiProperty({ example: '2025-05-26' })
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({ example: '10:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime must be in HH:mm format',
  })
  @IsOptional()
  scheduledTime?: string;

  @ApiPropertyOptional({ example: 'Thay toàn bộ chăn ga gối' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateHousekeepingStatusDto {
  @ApiProperty({
    enum: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.DONE],
    example: TaskStatus.IN_PROGRESS,
  })
  @IsEnum({
    PENDING: TaskStatus.PENDING,
    IN_PROGRESS: TaskStatus.IN_PROGRESS,
    DONE: TaskStatus.DONE,
  })
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
}

export class AssignHousekeepingDto {
  @ApiProperty({ example: 'uuid-staff-003' })
  @IsString()
  assignedToStaffId: string;
}

export class QueryHousekeepingDto {
  @ApiPropertyOptional({ example: 'uuid-branch-001' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ example: '2025-05-26' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({ example: 'uuid-staff-002' })
  @IsString()
  @IsOptional()
  assignedToStaffId?: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
