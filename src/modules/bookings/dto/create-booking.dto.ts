import { IsString, IsInt, IsNumber, IsOptional, IsDateString, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingSource } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-room-001' })
  @IsString()
  roomId: string;

  @ApiProperty({ example: 'uuid-guest-001' })
  @IsString()
  guestProfileId: string;

  @ApiProperty({ example: '2025-05-25T14:00:00Z' })
  @IsDateString()
  checkIn: string;

  @ApiProperty({ example: '2025-05-26T12:00:00Z' })
  @IsDateString()
  checkOut: string;

  @ApiProperty({ example: 'uuid-rate-003' })
  @IsString()
  rateId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  numAdults: number;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  numChildren?: number;

  @ApiPropertyOptional({ example: 200000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  depositAmount?: number;

  @ApiProperty({ enum: BookingSource, example: 'WALK_IN' })
  @IsEnum(BookingSource)
  source: BookingSource;

  @ApiPropertyOptional({ example: 'Khách yêu cầu phòng tầng cao, không hút thuốc' })
  @IsString()
  @IsOptional()
  note?: string;
}
