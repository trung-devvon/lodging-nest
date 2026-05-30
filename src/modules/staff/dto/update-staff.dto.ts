import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '@prisma/client';

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: '0902222333' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Trưởng lễ tân' })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({ enum: StaffRole, example: 'BRANCH_MANAGER' })
  @IsEnum(StaffRole)
  @IsOptional()
  staffRole?: StaffRole;

  @ApiPropertyOptional({ example: 'uuid-branch-001' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
