import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// Self-service "my profile" update — deliberately narrower than
// UpdateUserDto/UpdateInvestorDto (no isActive, no KYC/bank fields): this is
// what any logged-in user may change about themselves.
export class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
}
