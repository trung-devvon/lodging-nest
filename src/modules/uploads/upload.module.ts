import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [BranchesModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
