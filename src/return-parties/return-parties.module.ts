import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnParty } from './return-party.entity';
import { ReturnPartiesService } from './return-parties.service';
import { ReturnPartiesController } from './return-parties.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReturnParty])],
  controllers: [ReturnPartiesController],
  providers: [ReturnPartiesService],
  exports: [ReturnPartiesService],
})
export class ReturnPartiesModule {}
