import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CommonModule } from '../../common/common.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [CommonModule, AuditModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
