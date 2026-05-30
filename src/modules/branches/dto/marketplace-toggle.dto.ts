import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarketplaceToggleDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isListedOnMarketplace: boolean;
}
