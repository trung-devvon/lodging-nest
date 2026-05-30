import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '0909999888' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;
}
