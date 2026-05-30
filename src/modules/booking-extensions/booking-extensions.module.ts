import { Module } from '@nestjs/common';
import { BookingExtensionsController } from './booking-extensions.controller';
import { BookingExtensionsService } from './booking-extensions.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [BranchesModule],
  controllers: [BookingExtensionsController],
  providers: [BookingExtensionsService],
})
export class BookingExtensionsModule {}
