import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  imports: [CommonModule],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
