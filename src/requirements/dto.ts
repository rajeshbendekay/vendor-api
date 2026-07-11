import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { RequirementStatus, ServiceType } from '../common/enums';

export class RequirementItemDto {
  @IsOptional() @IsInt() id?: number;

  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsString()
  description: string;

  @IsOptional() @IsNumber() quantity?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsInt() assignedVendorId?: number;
  @IsOptional() @IsNumber() vendorCost?: number;
  @IsOptional() @IsNumber() markup?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateRequirementDto {
  @IsString()
  title: string;

  @IsOptional() @IsString() description?: string;

  @IsInt()
  clientId: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequirementItemDto)
  items?: RequirementItemDto[];
}

export class UpdateRequirementDto extends PartialType(CreateRequirementDto) {
  @IsOptional()
  @IsEnum(RequirementStatus)
  status?: RequirementStatus;
}

// Assign / cost a single work item.
export class AssignItemDto {
  @IsOptional() @IsInt() assignedVendorId?: number;
  @IsOptional() @IsNumber() vendorCost?: number;
  @IsOptional() @IsNumber() markup?: number;
}
