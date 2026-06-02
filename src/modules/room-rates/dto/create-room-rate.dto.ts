import { Prisma } from '@prisma/client';
import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DecimalInput } from '../../../common/validators/decimal-input.decorator';

export class CreateRoomRateDto {
  @ApiProperty({ example: '3 giờ' })
  @IsString()
  label: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  durationHours: number;

  @ApiProperty({ type: String, example: '200000.00' })
  @DecimalInput({ maxScale: 2, min: 0 })
  price: Prisma.Decimal;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
