import { ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryStaffDto {
  @ApiPropertyOptional({ example: 'uuid-branch-001' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: StaffRole, example: 'RECEPTIONIST' })
  @IsOptional()
  @IsEnum(StaffRole)
  staffRole?: StaffRole;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
