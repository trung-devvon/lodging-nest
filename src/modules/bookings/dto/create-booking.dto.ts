import { Prisma } from '@prisma/client';
import {
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingSource } from '@prisma/client';
import { DecimalInput } from '../../../common/validators/decimal-input.decorator';

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

  @ApiPropertyOptional({ type: String, example: '200000.00' })
  @IsOptional()
  @DecimalInput({ maxScale: 2, min: 0 })
  depositAmount?: Prisma.Decimal;

  @ApiProperty({ enum: BookingSource, example: 'WALK_IN' })
  @IsEnum(BookingSource)
  source: BookingSource;

  @ApiPropertyOptional({
    example: 'Khách yêu cầu phòng tầng cao, không hút thuốc',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
