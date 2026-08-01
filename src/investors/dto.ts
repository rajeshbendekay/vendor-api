import { IsEmail, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateInvestorDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() aadhaar?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() ifscCode?: string;
}

export class UpdateInvestorDto extends PartialType(CreateInvestorDto) {}
