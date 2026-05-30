import { Module } from '@nestjs/common';
import { RoomRatesController } from './room-rates.controller';
import { RoomRatesService } from './room-rates.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [BranchesModule],
  controllers: [RoomRatesController],
  providers: [RoomRatesService],
})
export class RoomRatesModule {}
