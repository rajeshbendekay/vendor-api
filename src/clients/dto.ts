import { IsEmail, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() gstNumber?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}
