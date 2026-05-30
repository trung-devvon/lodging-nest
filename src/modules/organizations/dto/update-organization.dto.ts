import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taxCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ enum: BusinessType })
  @IsEnum(BusinessType)
  @IsOptional()
  businessType?: BusinessType;
}
