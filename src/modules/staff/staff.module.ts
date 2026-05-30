import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [BranchesModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
