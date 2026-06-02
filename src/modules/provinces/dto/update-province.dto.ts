import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Region } from '@prisma/client';

export class UpdateProvinceDto {
  @ApiPropertyOptional({ example: 'Phú Quốc' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'phu-quoc' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ enum: Region, example: 'SOUTH' })
  @IsEnum(Region)
  @IsOptional()
  region?: Region;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
