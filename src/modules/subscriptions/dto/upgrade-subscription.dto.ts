import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpgradeSubscriptionDto {
  @ApiProperty({ example: 'uuid-plan-003' })
  @IsString()
  planId: string;
}
