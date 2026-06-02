import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrganizationStatus } from '@prisma/client';

export class UpdateOrgStatusDto {
  @ApiProperty({ enum: OrganizationStatus, example: 'PENDING_APPROVAL' })
  @IsEnum(OrganizationStatus)
  status: OrganizationStatus;
}
