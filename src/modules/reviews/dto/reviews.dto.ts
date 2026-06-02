import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ReplyReviewDto {
  @ApiProperty({ example: 'Cam on ban da ghe tham!' })
  @IsString()
  replyFromStaff: string;
}

export class UpdateReviewVisibilityDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isPublished: boolean;
}

export class QueryReviewsDto {
  @ApiPropertyOptional({ example: 'uuid-branch-001' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ example: true })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
