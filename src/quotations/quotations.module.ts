import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quotation } from './quotation.entity';
import { QuotationItem } from './quotation-item.entity';
import { Requirement } from '../requirements/requirement.entity';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Quotation, QuotationItem, Requirement])],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
