import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from '../vendors/vendor.entity';
import { Client } from '../clients/client.entity';
import { Requirement } from '../requirements/requirement.entity';
import { Invoice } from '../invoices/invoice.entity';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor, Client, Requirement, Invoice]),
  ],
  controllers: [DashboardController],
})
export class DashboardModule {}
