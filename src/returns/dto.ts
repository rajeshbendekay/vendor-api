import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ReturnWithdrawalType } from './return-withdrawal.entity';

export class CreateReturnDto {
  @IsInt()
  returnPartyId: number;

  @IsOptional()
  @IsInt()
  returnTypeId?: number;

  @IsNumber()
  @Min(0)
  returnAmount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  profitPercent: number;

  // endDate is derived server-side from startDate + return type's
  // numberOfDays, so it is intentionally not accepted here.
  @IsOptional() @IsDateString() startDate?: string;

  @IsOptional() @IsString() notes?: string;
}

export class UpdateReturnDto extends PartialType(CreateReturnDto) {}

export class CreateReturnWithdrawalDto {
  @IsOptional() @IsEnum(ReturnWithdrawalType) type?: ReturnWithdrawalType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional() @IsDateString() date?: string;

  @IsOptional() @IsString() notes?: string;
}

// type is intentionally not editable — recasting a Credit as a
// Withdrawal (or vice versa) after the fact is a different action, not
// a correction; delete and re-record it instead.
export class UpdateReturnWithdrawalDto {
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;

  @IsOptional() @IsDateString() date?: string;

  @IsOptional() @IsString() notes?: string;
}
