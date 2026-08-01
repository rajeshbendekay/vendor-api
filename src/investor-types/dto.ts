import { IsInt, IsString, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateInvestorTypeDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  numberOfDays: number;
}

export class UpdateInvestorTypeDto extends PartialType(CreateInvestorTypeDto) {}
