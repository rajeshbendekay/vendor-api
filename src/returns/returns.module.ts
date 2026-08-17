import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Return } from './return.entity';
import { ReturnWithdrawal } from './return-withdrawal.entity';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { ReturnPartiesModule } from '../return-parties/return-parties.module';
import { ReturnTypesModule } from '../return-types/return-types.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Return, ReturnWithdrawal]),
    ReturnPartiesModule,
    ReturnTypesModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
