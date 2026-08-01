import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Investment } from './investment.entity';
import { Withdrawal } from './withdrawal.entity';
import { InvestmentsService } from './investments.service';
import { InvestmentsController } from './investments.controller';
import { InvestorsModule } from '../investors/investors.module';
import { InvestorTypesModule } from '../investor-types/investor-types.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Investment, Withdrawal]),
    InvestorsModule,
    InvestorTypesModule,
  ],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
