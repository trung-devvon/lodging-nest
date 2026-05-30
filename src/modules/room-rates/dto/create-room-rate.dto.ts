import { IsString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomRateDto {
  @ApiProperty({ example: '3 giờ' })
  @IsString()
  label: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  durationHours: number;

  @ApiProperty({ example: 200000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
