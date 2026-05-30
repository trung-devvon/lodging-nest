import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'My Hotel Corp' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'my-hotel-corp' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsString()
  @IsOptional()
  taxCode?: string;

  @ApiPropertyOptional({ enum: BusinessType, example: 'HOTEL' })
  @IsEnum(BusinessType)
  @IsOptional()
  businessType?: BusinessType;
}
