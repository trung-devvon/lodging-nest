import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryBookingsDto {
  @ApiPropertyOptional({ example: 'uuid-branch-001' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ example: 'CONFIRMED' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: '2025-05-25' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 'BK-20250525' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number = 20;
}
