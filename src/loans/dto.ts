import {
  IsBoolean,
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
import { LoanStatus } from './loan.entity';

export class CreateLoanDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() aadhaar?: string;

  @IsOptional() @IsInt() loanTypeId?: number;

  @IsOptional() @IsString() bankName?: string;

  @IsNumber()
  @Min(0)
  loanAmount: number;

  // Only relevant when isInterestOnly is true.
  @IsOptional() @IsNumber() @Min(0) @Max(100) interestPercent?: number;
  @IsOptional() @IsNumber() @Min(0) interestAmount?: number;

  @IsOptional() @IsBoolean() isInterestOnly?: boolean;

  // Only relevant when isInterestOnly is false.
  @IsOptional() @IsInt() @Min(1) totalEmis?: number;
  @IsOptional() @IsNumber() @Min(0) installmentAmount?: number;

  // Defaults to loanAmount on create when omitted — see loans.service.ts.
  @IsOptional() @IsNumber() @Min(0) principalOutstanding?: number;

  @IsOptional() @IsDateString() startDate?: string;

  @IsOptional() @IsEnum(LoanStatus) status?: LoanStatus;

  @IsOptional() @IsString() notes?: string;
}

export class UpdateLoanDto extends PartialType(CreateLoanDto) {}
