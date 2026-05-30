import { Module } from '@nestjs/common';
import { RoomPricingController } from './room-pricing.controller';
import { RoomPricingService } from './room-pricing.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [BranchesModule],
  controllers: [RoomPricingController],
  providers: [RoomPricingService],
  exports: [RoomPricingService],
})
export class RoomPricingModule {}
