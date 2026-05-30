import { IsString, IsOptional, IsEmail, IsEnum, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class CreateGuestDto {
  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '0901111222' })
  @IsString()
  phone: string;

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

  @ApiPropertyOptional({ enum: Gender, example: 'MALE' })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: 'Khách hay đặt phòng view biển' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: ['VIP'] })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
