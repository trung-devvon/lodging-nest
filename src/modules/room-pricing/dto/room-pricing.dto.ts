import { Prisma } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceAdjustType } from '@prisma/client';
import { DecimalInput } from '../../../common/validators/decimal-input.decorator';

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

  @ApiProperty({ type: String, example: '50.00' })
  @DecimalInput({ maxScale: 2, min: 0 })
  adjustValue: Prisma.Decimal;

  @ApiPropertyOptional({ type: String, example: '280000.00' })
  @IsOptional()
  @DecimalInput({ maxScale: 2, min: 0 })
  overridePrice?: Prisma.Decimal;
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

  @ApiPropertyOptional({ type: String, example: '50.00' })
  @IsOptional()
  @DecimalInput({ maxScale: 2, min: 0 })
  adjustValue?: Prisma.Decimal;

  @ApiPropertyOptional({ type: String, example: '280000.00' })
  @IsOptional()
  @DecimalInput({ maxScale: 2, min: 0 })
  overridePrice?: Prisma.Decimal;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
