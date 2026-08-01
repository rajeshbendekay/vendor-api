import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestorType } from './investor-type.entity';
import { InvestorTypesService } from './investor-types.service';
import { InvestorTypesController } from './investor-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InvestorType])],
  controllers: [InvestorTypesController],
  providers: [InvestorTypesService],
  exports: [InvestorTypesService],
})
export class InvestorTypesModule {}
