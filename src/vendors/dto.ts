import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ServiceType } from '../common/enums';

export class CreateVendorDto {
  @IsString()
  name: string;

  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() gstNumber?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ServiceType, { each: true })
  specialties?: ServiceType[];

  @IsOptional() @IsString() notes?: string;
}

export class UpdateVendorDto extends PartialType(CreateVendorDto) {}
