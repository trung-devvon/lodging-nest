import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType } from '@prisma/client';

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
  @IsOptional()
  scheduledTime?: string;

  @ApiPropertyOptional({ example: 'Thay toàn bộ chăn ga gối' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateHousekeepingStatusDto {
  @ApiProperty({ enum: ['PENDING', 'IN_PROGRESS', 'DONE'], example: 'IN_PROGRESS' })
  @IsEnum(['PENDING', 'IN_PROGRESS', 'DONE'] as const)
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
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'uuid-staff-002' })
  @IsString()
  @IsOptional()
  assignedToStaffId?: string;
}
