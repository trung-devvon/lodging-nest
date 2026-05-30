import { IsString, IsOptional, IsArray, IsNumber, Min, IsBoolean, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBranchDto {
  private static readonly TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

  @ApiPropertyOptional({ example: 'An Nhiên Homestay - Cơ sở Vũng Tàu' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '123 Trần Phú, Phường 1' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'TP. Vũng Tàu' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 10.3461 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 107.084 })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Homestay view biển đẹp nhất Vũng Tàu' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ['wifi', 'pool', 'parking', 'bbq', 'gym'] })
  @IsArray()
  @IsOptional()
  amenities?: string[];

  @ApiPropertyOptional({ example: '14:00' })
  @IsString()
  @Matches(UpdateBranchDto.TIME_PATTERN, {
    message: 'checkInTime must be in HH:mm format',
  })
  @IsOptional()
  checkInTime?: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsString()
  @Matches(UpdateBranchDto.TIME_PATTERN, {
    message: 'checkOutTime must be in HH:mm format',
  })
  @IsOptional()
  checkOutTime?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  bufferHours?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
