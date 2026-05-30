import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBookingPriceDto {
  @ApiProperty({ example: 450000 })
  @IsNumber()
  @Min(0)
  finalPrice: number;

  @ApiPropertyOptional({ example: 'Giảm giá khách quen 10%' })
  @IsString()
  @IsOptional()
  priceNote?: string;
}
