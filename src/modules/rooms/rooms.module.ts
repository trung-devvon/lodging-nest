import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [BranchesModule],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
