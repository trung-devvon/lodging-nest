import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [BranchesModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
