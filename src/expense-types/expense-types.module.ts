import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseType } from './expense-type.entity';
import { ExpenseTypesService } from './expense-types.service';
import { ExpenseTypesController } from './expense-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExpenseType])],
  controllers: [ExpenseTypesController],
  providers: [ExpenseTypesService],
  exports: [ExpenseTypesService],
})
export class ExpenseTypesModule {}
