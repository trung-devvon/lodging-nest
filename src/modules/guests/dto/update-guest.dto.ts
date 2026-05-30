import { IsString, IsOptional, IsEmail, IsEnum, IsDateString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class UpdateGuestDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn An' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: '0901111222' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'an.nguyen@gmail.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '012345678901' })
  @IsString()
  @IsOptional()
  nationalId?: string;

  @ApiPropertyOptional({ example: 'VN' })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({ example: '1990-03-15' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: 'Dị ứng lông vật nuôi' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: ['VIP', 'REGULAR'] })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
