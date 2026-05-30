import { IsString, IsInt, IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ example: 220000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

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
