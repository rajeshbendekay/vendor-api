import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanType } from './loan-type.entity';
import { LoanTypesService } from './loan-types.service';
import { LoanTypesController } from './loan-types.controller';
import { LoanTypeSeedService } from './seed/loan-type-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoanType])],
  controllers: [LoanTypesController],
  providers: [LoanTypesService, LoanTypeSeedService],
  exports: [LoanTypesService],
})
export class LoanTypesModule {}
