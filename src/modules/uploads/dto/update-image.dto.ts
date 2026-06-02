import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateImageDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: 'Ho boi tang thuong' })
  @IsOptional()
  @IsString()
  altText?: string;
}
