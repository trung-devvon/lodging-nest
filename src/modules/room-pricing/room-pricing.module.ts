import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { RoomPricingController } from './room-pricing.controller';
import { RoomPricingService } from './room-pricing.service';

@Module({
  imports: [CommonModule],
  controllers: [RoomPricingController],
  providers: [RoomPricingService],
  exports: [RoomPricingService],
})
export class RoomPricingModule {}
