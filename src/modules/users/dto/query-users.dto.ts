import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class QueryUsersDto {
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

  @ApiPropertyOptional({ enum: UserRole, example: 'ORG_OWNER' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: 'nguyen' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => String)
  isActive?: string;
}
