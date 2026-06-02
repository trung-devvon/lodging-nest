import {
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryBookingsDto {
  @ApiPropertyOptional({ example: 'uuid-branch-001' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: BookingStatus, example: 'CONFIRMED' })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({ example: '2025-05-25' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 'BK-20250525' })
  @IsString()
  @IsOptional()
  search?: string;

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
