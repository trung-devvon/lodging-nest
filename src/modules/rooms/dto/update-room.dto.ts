import { IsString, IsOptional, IsInt, IsEnum, IsArray, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoomType, BedType, RoomStatus } from '@prisma/client';

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'Phòng Deluxe Giường Đôi - 101' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: RoomType })
  @IsEnum(RoomType)
  @IsOptional()
  roomType?: RoomType;

  @ApiPropertyOptional({ example: 3 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  bedCount?: number;

  @ApiPropertyOptional({ enum: BedType })
  @IsEnum(BedType)
  @IsOptional()
  bedType?: BedType;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  floorNumber?: number;

  @ApiPropertyOptional({ example: ['tv', 'air_conditioner', 'hot_water', 'balcony', 'minibar', 'bathtub'] })
  @IsArray()
  @IsOptional()
  roomAmenities?: string[];

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  bufferHours?: number | null;

  @ApiPropertyOptional({ enum: RoomStatus })
  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;
}
