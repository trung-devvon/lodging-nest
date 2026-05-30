import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReplyReviewDto {
  @ApiProperty({ example: 'Cảm ơn bạn đã ghé thăm!' })
  @IsString()
  replyFromStaff: string;
}

export class UpdateReviewVisibilityDto {
  @ApiProperty({ example: false })
  isPublished: boolean;
}

export class QueryReviewsDto {
  @ApiPropertyOptional({ example: 'uuid-branch-001' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isPublished?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number = 20;
}
