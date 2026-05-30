import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [BranchesModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
