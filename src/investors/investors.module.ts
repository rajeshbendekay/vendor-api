import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Investor } from './investor.entity';
import { InvestorsService } from './investors.service';
import { InvestorsController } from './investors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Investor])],
  controllers: [InvestorsController],
  providers: [InvestorsService],
  exports: [InvestorsService],
})
export class InvestorsModule {}
