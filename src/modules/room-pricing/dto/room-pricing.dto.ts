import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceAdjustType } from '@prisma/client';

export class CreateRoomPricingDto {
  @ApiPropertyOptional({ example: null })
  @IsString()
  @IsOptional()
  rateId?: string;

  @ApiPropertyOptional({ example: 'Lễ 30/4 - 1/5' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ example: '2025-04-30' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-05-01' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: PriceAdjustType, example: 'PERCENT_INCREASE' })
  @IsEnum(PriceAdjustType)
  priceAdjustType: PriceAdjustType;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  adjustValue: number;

  @ApiPropertyOptional({ example: 280000 })
  @IsNumber()
  @IsOptional()
  overridePrice?: number;
}

export class UpdateRoomPricingDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rateId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: PriceAdjustType })
  @IsEnum(PriceAdjustType)
  @IsOptional()
  priceAdjustType?: PriceAdjustType;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  adjustValue?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  overridePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}
