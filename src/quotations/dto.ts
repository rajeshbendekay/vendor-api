import { IsOptional, IsString } from 'class-validator';

// Generating a quotation snapshots the requirement's current item costs.
export class GenerateQuotationDto {
  @IsOptional() @IsString() internalNote?: string;
}

// Client asks us to bring the price down (negotiation round).
export class RequestRevisionDto {
  @IsOptional() @IsString() clientNote?: string;
}
