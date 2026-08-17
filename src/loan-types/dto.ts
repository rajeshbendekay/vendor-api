import { IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateLoanTypeDto {
  @IsString()
  name: string;
}

export class UpdateLoanTypeDto extends PartialType(CreateLoanTypeDto) {}
