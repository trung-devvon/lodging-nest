import { Module } from '@nestjs/common';
import { AccessContextService } from './services/access-context.service';
import { EmailService } from './services/email.service';
import { HousekeepingDispatchService } from './services/housekeeping-dispatch.service';
import { OccupancyService } from './services/occupancy.service';

@Module({
  providers: [
    AccessContextService,
    EmailService,
    OccupancyService,
    HousekeepingDispatchService,
  ],
  exports: [
    AccessContextService,
    EmailService,
    OccupancyService,
    HousekeepingDispatchService,
  ],
})
export class CommonModule {}
