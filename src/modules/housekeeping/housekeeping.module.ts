import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { HousekeepingController } from './housekeeping.controller';
import { HousekeepingService } from './housekeeping.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [CommonModule, AuditModule],
  controllers: [HousekeepingController],
  providers: [HousekeepingService],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}
