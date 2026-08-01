import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

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
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional() @IsDateString() date?: string;

  @IsOptional() @IsString() notes?: string;
}
