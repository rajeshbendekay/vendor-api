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
import { WithdrawalType } from './withdrawal.entity';

export class CreateInvestmentDto {
  @IsInt()
  investorId: number;

  @IsOptional()
  @IsInt()
  investorTypeId?: number;

  @IsNumber()
  @Min(0)
  investmentAmount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  profitPercent: number;

  // endDate is derived server-side from startDate + investor type's
  // numberOfDays, so it is intentionally not accepted here.
  @IsOptional() @IsDateString() startDate?: string;

  @IsOptional() @IsString() notes?: string;
}

export class UpdateInvestmentDto extends PartialType(CreateInvestmentDto) {}

export class CreateWithdrawalDto {
  @IsOptional() @IsEnum(WithdrawalType) type?: WithdrawalType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional() @IsDateString() date?: string;

  @IsOptional() @IsString() notes?: string;
}

// type is intentionally not editable — recasting a Credit as a
// Withdrawal (or vice versa) after the fact is a different action, not
// a correction; delete and re-record it instead.
export class UpdateWithdrawalDto {
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;

  @IsOptional() @IsDateString() date?: string;

  @IsOptional() @IsString() notes?: string;
}

// A payout of part of the outstanding amount (see settlePartial). The
// full outstanding amount is settled via PFS instead, which closes out
// the installment.
export class CreatePartialSettlementDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional() @IsDateString() date?: string;

  @IsOptional() @IsString() notes?: string;
}
