import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [CommonModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
