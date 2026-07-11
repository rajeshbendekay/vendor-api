import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { InvoiceStatus } from '../common/enums';

export class CreateInvoiceDto {
  @IsInt()
  requirementId: number;

  // The accepted quotation this invoice is raised against.
  @IsOptional() @IsInt() quotationId?: number;

  // Client's purchase order reference.
  @IsOptional() @IsString() clientPoNumber?: string;

  // Tax rate; defaults to 18 (GST) if omitted.
  @IsOptional() @IsNumber() taxPercent?: number;

  @IsOptional() @IsString() notes?: string;
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {
  @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
}
