import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ReturnSettlementMode } from './return-type.entity';

export class CreateReturnTypeDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  numberOfDays: number;

  @IsOptional() @IsEnum(ReturnSettlementMode) settlementMode?: ReturnSettlementMode;
}

export class UpdateReturnTypeDto extends PartialType(CreateReturnTypeDto) {}
