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

  // Login password for this investor. Required to create a brand-new login
  // on create; omit it if this phone already has a login (e.g. the same
  // person is already a return party) — the INVESTOR role is added onto
  // that existing login instead (see investors.service.ts).
  @IsOptional() @IsString() @MinLength(8) password?: string;
}

// PartialType makes every field (including password) optional — on update,
// omit password to keep the investor's existing login password unchanged.
export class UpdateInvestorDto extends PartialType(CreateInvestorDto) {}
