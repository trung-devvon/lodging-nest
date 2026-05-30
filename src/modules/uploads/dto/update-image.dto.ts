import { ApiProperty } from '@nestjs/swagger';

export class UpdateImageDto {
  @ApiProperty({ required: false })
  isCover?: boolean;

  @ApiProperty({ required: false })
  sortOrder?: number;

  @ApiProperty({ required: false })
  altText?: string;
}
