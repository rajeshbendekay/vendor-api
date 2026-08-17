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
import { Investor } from './investors/investor.entity';
import { InvestorType } from './investor-types/investor-type.entity';
import { Investment } from './investments/investment.entity';
import { Withdrawal } from './investments/withdrawal.entity';
import { ReturnParty } from './return-parties/return-party.entity';
import { ReturnType } from './return-types/return-type.entity';
import { Return } from './returns/return.entity';
import { ReturnWithdrawal } from './returns/return-withdrawal.entity';
import { User } from './users/user.entity';
import { MenuPermission } from './menu-permissions/menu-permission.entity';
import { LoanType } from './loan-types/loan-type.entity';
import { Loan } from './loans/loan.entity';

import { VendorsModule } from './vendors/vendors.module';
import { ClientsModule } from './clients/clients.module';
import { RequirementsModule } from './requirements/requirements.module';
import { QuotationsModule } from './quotations/quotations.module';
import { InvoicesModule } from './invoices/invoices.module';
import { InvestorsModule } from './investors/investors.module';
import { InvestorTypesModule } from './investor-types/investor-types.module';
import { InvestmentsModule } from './investments/investments.module';
import { ReturnPartiesModule } from './return-parties/return-parties.module';
import { ReturnTypesModule } from './return-types/return-types.module';
import { ReturnsModule } from './returns/returns.module';
import { LoanTypesModule } from './loan-types/loan-types.module';
import { LoansModule } from './loans/loans.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MenuPermissionsModule } from './menu-permissions/menu-permissions.module';
import { ProfileModule } from './profile/profile.module';

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
          Investor,
          InvestorType,
          Investment,
          Withdrawal,
          ReturnParty,
          ReturnType,
          Return,
          ReturnWithdrawal,
          User,
          MenuPermission,
          LoanType,
          Loan,
        ],
        synchronize: true, // dev convenience: auto-create/update tables
      }),
    }),
    VendorsModule,
    ClientsModule,
    RequirementsModule,
    QuotationsModule,
    InvoicesModule,
    InvestorsModule,
    InvestorTypesModule,
    InvestmentsModule,
    ReturnPartiesModule,
    ReturnTypesModule,
    ReturnsModule,
    LoanTypesModule,
    LoansModule,
    DashboardModule,
    AuthModule,
    UsersModule,
    MenuPermissionsModule,
    ProfileModule,
  ],
})
export class AppModule {}
