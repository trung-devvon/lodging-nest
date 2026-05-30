import { IsEnum, IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus, example: 'CHECKED_IN' })
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @ApiPropertyOptional({ example: '2025-05-26T11:30:00Z' })
  @IsDateString()
  @IsOptional()
  actualCheckOut?: string;

  @ApiPropertyOptional({ example: 'Khách báo hủy qua điện thoại' })
  @IsString()
  @IsOptional()
  cancelReason?: string;
}
