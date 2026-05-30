import { IsString, IsOptional, IsArray, IsNumber, Min, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  private static readonly TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

  @ApiProperty({ example: 'uuid-prov-002' })
  @IsString()
  provinceId: string;

  @ApiProperty({ example: 'An Nhiên Homestay - Cơ sở Vũng Tàu' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123 Trần Phú, Phường 1' })
  @IsString()
  address: string;

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

  @ApiPropertyOptional({ example: 'Homestay view biển...' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ['wifi', 'pool', 'parking'] })
  @IsArray()
  @IsOptional()
  amenities?: string[];

  @ApiPropertyOptional({ example: '14:00' })
  @IsString()
  @Matches(CreateBranchDto.TIME_PATTERN, {
    message: 'checkInTime must be in HH:mm format',
  })
  @IsOptional()
  checkInTime?: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsString()
  @Matches(CreateBranchDto.TIME_PATTERN, {
    message: 'checkOutTime must be in HH:mm format',
  })
  @IsOptional()
  checkOutTime?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  bufferHours?: number;
}
