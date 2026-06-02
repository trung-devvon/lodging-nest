import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { RoomRatesController } from './room-rates.controller';
import { RoomRatesService } from './room-rates.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [CommonModule, BranchesModule],
  controllers: [RoomRatesController],
  providers: [RoomRatesService],
})
export class RoomRatesModule {}
