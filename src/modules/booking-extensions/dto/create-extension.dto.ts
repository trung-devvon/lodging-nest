import { Prisma } from '@prisma/client';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DecimalInput } from '../../../common/validators/decimal-input.decorator';

export class CreateExtensionDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  extraHours: number;

  @ApiProperty({ type: String, example: '150000.00' })
  @DecimalInput({ maxScale: 2, min: 0 })
  extraPrice: Prisma.Decimal;

  @ApiPropertyOptional({ example: 'Khách xin ở thêm 2 tiếng' })
  @IsString()
  @IsOptional()
  note?: string;
}
