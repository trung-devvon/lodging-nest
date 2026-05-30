import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoomStatus } from '@prisma/client';

export class UpdateRoomStatusDto {
  @ApiProperty({ enum: RoomStatus, example: 'MAINTENANCE' })
  @IsEnum(RoomStatus)
  status: RoomStatus;
}
