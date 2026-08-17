import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateReturnPartyDto {
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

  // Login password for this return party — required on create so they can
  // sign in with their phone/email immediately (see
  // return-parties.service.ts, which creates the linked User account in
  // the same transaction).
  @IsString() @MinLength(8) password: string;
}

// PartialType makes every field (including password) optional — on update,
// omit password to keep the return party's existing login password unchanged.
export class UpdateReturnPartyDto extends PartialType(CreateReturnPartyDto) {}
