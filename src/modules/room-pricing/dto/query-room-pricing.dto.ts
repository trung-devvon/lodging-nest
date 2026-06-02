import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class QueryRoomPricingDto {
  @ApiPropertyOptional({ example: '2025-05-01' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2025-07-31' })
  @IsDateString()
  @IsOptional()
  to?: string;
}
