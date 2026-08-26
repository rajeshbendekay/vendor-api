import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { PaymentMode } from './expense.entity';

export class CreateExpenseDto {
  @IsInt()
  expenseTypeId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  expenseDate: string;

  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsEnum(PaymentMode) paymentMode?: PaymentMode;
  @IsOptional() @IsString() referenceNo?: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {
  // Lets the attachment be cleared without uploading a replacement.
  @IsOptional() @IsBoolean() removeAttachment?: boolean;
}
