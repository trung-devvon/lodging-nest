import { Prisma } from '@prisma/client';
import { IsString, IsInt, IsOptional, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DecimalInput } from '../../../common/validators/decimal-input.decorator';

export class UpdateRoomRateDto {
  @ApiPropertyOptional({ example: '3 giờ' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationHours?: number;

  @ApiPropertyOptional({ type: String, example: '220000.00' })
  @IsOptional()
  @DecimalInput({ maxScale: 2, min: 0 })
  price?: Prisma.Decimal;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
