import { Type } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Region } from '@prisma/client';

export class CreateProvinceDto {
  @ApiProperty({ example: 'Phú Quốc' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'phu-quoc' })
  @IsString()
  slug: string;

  @ApiProperty({ enum: Region, example: 'SOUTH' })
  @IsEnum(Region)
  region: Region;

  @ApiPropertyOptional({ example: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
