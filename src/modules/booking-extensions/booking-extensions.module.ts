import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { BookingExtensionsController } from './booking-extensions.controller';
import { BookingExtensionsService } from './booking-extensions.service';

@Module({
  imports: [CommonModule],
  controllers: [BookingExtensionsController],
  providers: [BookingExtensionsService],
})
export class BookingExtensionsModule {}
