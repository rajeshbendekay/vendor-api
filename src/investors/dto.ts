import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
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

  // Login password for this investor — required on create so they can sign
  // in with their phone/email immediately (see investors.service.ts, which
  // creates the linked User account in the same transaction).
  @IsString() @MinLength(8) password: string;
}

// PartialType makes every field (including password) optional — on update,
// omit password to keep the investor's existing login password unchanged.
export class UpdateInvestorDto extends PartialType(CreateInvestorDto) {}
