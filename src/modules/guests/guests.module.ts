import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

@Module({
  imports: [CommonModule],
  controllers: [GuestsController],
  providers: [GuestsService],
})
export class GuestsModule {}
