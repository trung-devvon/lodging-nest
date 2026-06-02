import { Prisma } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DecimalInput } from '../../../common/validators/decimal-input.decorator';

export class UpdateBookingPriceDto {
  @ApiProperty({ type: String, example: '450000.00' })
  @DecimalInput({ maxScale: 2, min: 0 })
  finalPrice: Prisma.Decimal;

  @ApiPropertyOptional({ example: 'Giảm giá khách quen 10%' })
  @IsString()
  @IsOptional()
  priceNote?: string;
}
