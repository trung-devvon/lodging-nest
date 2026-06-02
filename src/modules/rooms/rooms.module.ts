import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { BranchesModule } from '../branches/branches.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [CommonModule, BranchesModule, AuditModule],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
