import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryOrganizationsDto {
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

  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
}
