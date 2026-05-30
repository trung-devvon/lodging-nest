import { IsEmail, IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { BusinessType } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  businessType?: BusinessType;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
