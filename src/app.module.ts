import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Vendor } from './vendors/vendor.entity';
import { Client } from './clients/client.entity';
import { Requirement } from './requirements/requirement.entity';
import { RequirementItem } from './requirements/requirement-item.entity';
import { Quotation } from './quotations/quotation.entity';
import { QuotationItem } from './quotations/quotation-item.entity';
import { Invoice } from './invoices/invoice.entity';

import { VendorsModule } from './vendors/vendors.module';
import { ClientsModule } from './clients/clients.module';
import { RequirementsModule } from './requirements/requirements.module';
import { QuotationsModule } from './quotations/quotations.module';
import { InvoicesModule } from './invoices/invoices.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', '127.0.0.1'),
        port: parseInt(config.get('DB_PORT', '3306'), 10),
        username: config.get('DB_USER', 'root'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_NAME', 'flexsignage'),
        entities: [
          Vendor,
          Client,
          Requirement,
          RequirementItem,
          Quotation,
          QuotationItem,
          Invoice,
        ],
        synchronize: true, // dev convenience: auto-create/update tables
      }),
    }),
    VendorsModule,
    ClientsModule,
    RequirementsModule,
    QuotationsModule,
    InvoicesModule,
    DashboardModule,
    AuthModule,
  ],
})
export class AppModule {}
