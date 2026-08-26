import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './expense.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpenseTypesModule } from '../expense-types/expense-types.module';

@Module({
  imports: [TypeOrmModule.forFeature([Expense]), ExpenseTypesModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
