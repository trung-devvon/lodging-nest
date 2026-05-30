import { IsOptional, IsInt, Min, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryNotificationsDto {
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
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by read status: "true" or "false"' })
  @IsString()
  @IsOptional()
  isRead?: string;
}
