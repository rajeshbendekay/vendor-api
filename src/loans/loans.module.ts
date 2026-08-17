import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from './loan.entity';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { LoanTypesModule } from '../loan-types/loan-types.module';

@Module({
  imports: [TypeOrmModule.forFeature([Loan]), LoanTypesModule],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
