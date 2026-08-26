import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from './user-role.enum';

// Shared KYC fields written into the linked Investor and/or ReturnParty
// row(s) created for a login — same shape as CreateInvestorDto/
// CreateReturnPartyDto minus the identity fields (name/phone/email/
// password), which live on the User itself.
export class KycFieldsDto {
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() aadhaar?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() ifscCode?: string;
}

// POST /users onboards a login with one or more roles in one step — pick
// ADMIN and/or INVESTOR and/or RETURN_PARTY; investor/returnParty carry the
// KYC data for whichever of those two roles is selected (see
// users.service.ts, which creates the matching Investor/ReturnParty row(s)
// in the same transaction as the login).
export class CreateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @MinLength(8) password: string;

  @IsArray() @ArrayNotEmpty() @IsEnum(UserRole, { each: true }) roles: UserRole[];

  @IsOptional() @ValidateNested() @Type(() => KycFieldsDto) investor?: KycFieldsDto;
  @IsOptional() @ValidateNested() @Type(() => KycFieldsDto) returnParty?: KycFieldsDto;
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// PATCH /users/:id/roles adds roles onto an existing login — add-only, any
// role the user already holds is silently ignored rather than removed (see
// UsersService.addRoles).
export class AddUserRolesDto {
  @IsArray() @ArrayNotEmpty() @IsEnum(UserRole, { each: true }) roles: UserRole[];

  @IsOptional() @ValidateNested() @Type(() => KycFieldsDto) investor?: KycFieldsDto;
  @IsOptional() @ValidateNested() @Type(() => KycFieldsDto) returnParty?: KycFieldsDto;
}
