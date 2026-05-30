import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleActiveDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}
