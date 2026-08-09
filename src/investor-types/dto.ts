import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { SettlementMode } from './investor-type.entity';

export class CreateInvestorTypeDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  numberOfDays: number;

  @IsOptional() @IsEnum(SettlementMode) settlementMode?: SettlementMode;
}

export class UpdateInvestorTypeDto extends PartialType(CreateInvestorTypeDto) {}
