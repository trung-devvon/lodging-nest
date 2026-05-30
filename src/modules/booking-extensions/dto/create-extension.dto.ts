import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExtensionDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  extraHours: number;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0)
  extraPrice: number;

  @ApiPropertyOptional({ example: 'Khách xin ở thêm 2 tiếng' })
  @IsString()
  @IsOptional()
  note?: string;
}
