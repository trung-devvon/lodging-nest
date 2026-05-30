import { IsString, IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffRole } from '@prisma/client';

export class CreateStaffDto {
  @ApiProperty({ example: 'letan01@annhien.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'Staff@123456' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: '0902222333' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'uuid-branch-001' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ example: 'Lễ tân' })
  @IsString()
  position: string;

  @ApiProperty({ enum: StaffRole, example: 'RECEPTIONIST' })
  @IsEnum(StaffRole)
  staffRole: StaffRole;

  @ApiPropertyOptional({ example: '2025-05-01' })
  @IsDateString()
  @IsOptional()
  hireDate?: string;
}
