import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoomStatus, RoomType } from '@prisma/client';

export class QueryRoomsDto {
  @ApiPropertyOptional({ enum: RoomStatus })
  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;

  @ApiPropertyOptional({ enum: RoomType })
  @IsEnum(RoomType)
  @IsOptional()
  roomType?: RoomType;

  @ApiPropertyOptional({ example: '2025-05-25T14:00:00Z' })
  @IsDateString()
  @IsOptional()
  checkIn?: string;

  @ApiPropertyOptional({ example: '2025-05-26T12:00:00Z' })
  @IsDateString()
  @IsOptional()
  checkOut?: string;
}
