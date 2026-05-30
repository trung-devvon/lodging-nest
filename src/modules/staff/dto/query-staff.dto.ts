import { IsOptional, IsString, IsBoolean, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '@prisma/client';

export class QueryStaffDto {
  @ApiPropertyOptional({ example: 'uuid-branch-001' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: StaffRole, example: 'RECEPTIONIST' })
  @IsOptional()
  @IsString()
  staffRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isActive?: string;
}
