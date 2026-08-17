import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnType } from './return-type.entity';
import { ReturnTypesService } from './return-types.service';
import { ReturnTypesController } from './return-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReturnType])],
  controllers: [ReturnTypesController],
  providers: [ReturnTypesService],
  exports: [ReturnTypesService],
})
export class ReturnTypesModule {}
