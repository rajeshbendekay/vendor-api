import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateExpenseTypeDto {
  @IsString()
  name: string;

  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateExpenseTypeDto extends PartialType(CreateExpenseTypeDto) {}
