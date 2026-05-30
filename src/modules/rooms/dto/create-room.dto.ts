import { IsString, IsOptional, IsInt, IsEnum, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomType, BedType } from '@prisma/client';

export class CreateRoomDto {
  @ApiProperty({ example: 'Phòng Deluxe Giường Đôi - 101' })
  @IsString()
  name: string;

  @ApiProperty({ enum: RoomType, example: 'DELUXE' })
  @IsEnum(RoomType)
  roomType: RoomType;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  bedCount: number;

  @ApiProperty({ enum: BedType, example: 'QUEEN' })
  @IsEnum(BedType)
  bedType: BedType;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  floorNumber?: number;

  @ApiPropertyOptional({ example: ['tv', 'air_conditioner', 'hot_water', 'balcony', 'minibar'] })
  @IsArray()
  @IsOptional()
  roomAmenities?: string[];

  @ApiPropertyOptional({ example: null })
  @IsInt()
  @IsOptional()
  bufferHours?: number | null;
}
