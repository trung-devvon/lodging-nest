import { Module } from '@nestjs/common';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [BranchesModule],
  controllers: [GuestsController],
  providers: [GuestsService],
})
export class GuestsModule {}
